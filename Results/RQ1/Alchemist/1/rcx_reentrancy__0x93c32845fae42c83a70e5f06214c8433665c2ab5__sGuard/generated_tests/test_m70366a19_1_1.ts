import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant kill test - equality vs greater-than", function () {
  it("should allow withdrawal when balance equals requested amount (kills mutant m70366a19)", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy X_WALLET with the Log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Get current block timestamp for unlock time
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    const currentTime = block!.timestamp;

    // User deposits exactly 1 ether (MinSum is 1 ether)
    const depositAmount = ethers.parseEther("1");
    await instance.connect(user).Put(currentTime + 10, { value: depositAmount });

    // Advance time past unlock time
    await ethers.provider.send("evm_increaseTime", [20]);
    await ethers.provider.send("evm_mine", []);

    // Get balance before withdrawal
    const holderBefore = await instance.Acc(user.address);
    const balanceBefore = holderBefore.balance;

    // Attempt to withdraw exactly the balance (should succeed in original, fail in mutant)
    const tx = instance.connect(user).Collect(balanceBefore);

    // In the original contract this succeeds, but the mutant with > will revert
    await expect(tx).to.not.be.reverted;

    // Verify balance is zero after successful withdrawal
    const holderAfter = await instance.Acc(user.address);
    expect(holderAfter.balance).to.equal(0);
  });
});