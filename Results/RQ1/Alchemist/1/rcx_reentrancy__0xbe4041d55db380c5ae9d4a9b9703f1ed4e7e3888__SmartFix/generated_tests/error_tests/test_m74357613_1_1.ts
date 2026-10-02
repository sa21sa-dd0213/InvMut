import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant detection - Put unlockTime calculation", function () {
  it("should detect mutant where block.timestamp+_lockTime is replaced with block.timestamp*_lockTime", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy MONEY_BOX (no constructor arguments)
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy Log contract (needed for Put to work)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Set LogFile address (required for Put to not revert)
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());

    // Initialize the contract
    await instance.connect(owner).Initialized();

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore!.timestamp;

    // Call Put with a small lock time (e.g., 100 seconds)
    const lockTime = 100;
    const depositAmount = ethers.parseEther("1.0");

    await instance.connect(addr1).Put(lockTime, { value: depositAmount });

    // Read the unlockTime from the account storage
    const holder = await instance.Acc(addr1.address);
    const unlockTime = holder.unlockTime;

    // In the original contract: unlockTime should be currentTimestamp + lockTime
    // In the mutant: unlockTime would be currentTimestamp * lockTime (huge number)
    const expectedUnlockTime = BigInt(currentTimestamp) + BigInt(lockTime);

    // The mutant would set unlockTime to currentTimestamp * 100
    // This would be an astronomically large number (e.g., ~170000000000)
    // The original sets it to currentTimestamp + 100 (e.g., ~1700000100)
    // So the mutant value would be ~100x larger, easily detectable
    expect(unlockTime).to.equal(expectedUnlockTime);

    // Additional check: verify that Collect would work with original calculation
    // but fail with mutant calculation (since unlockTime would be too large)
    const minSum = ethers.parseEther("0.1");
    await instance.connect(owner).SetMinSum(minSum);

    // Wait until after unlock time
    await ethers.provider.send("evm_increaseTime", [lockTime + 1]);
    await ethers.provider.send("evm_mine", []);

    // This should succeed with original but fail with mutant
    const collectAmount = ethers.parseEther("0.5");

    // With original: collect should succeed (unlockTime passed)
    // With mutant: collect would revert because unlockTime is huge
    const tx = instance.connect(addr1).Collect(collectAmount);

    // If the contract has the original logic, this should succeed
    // If the contract has the mutant logic, this should revert
    // We expect it to succeed (original behavior)
    await expect(tx).to.not.be.reverted;
  });
});