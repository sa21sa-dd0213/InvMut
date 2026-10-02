import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m08c95fbc detection", function () {
  it("should detect mutant by exploiting block.prevrandao vs block.timestamp difference", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore!.timestamp;

    // Set unlockTime to current timestamp + 100 seconds (future lock)
    const futureUnlockTime = currentTimestamp + 100;

    // Send 2 ether to Put function with future unlockTime
    const putTx = await bank.connect(user).Put(futureUnlockTime, {
      value: ethers.parseEther("2.0")
    });
    await putTx.wait();

    // Check that user's balance was recorded
    const holderInfo = await bank.Acc(user.address);
    expect(holderInfo.balance).to.equal(ethers.parseEther("2.0"));

    // Mine a new block to advance time (but still before unlockTime)
    await ethers.provider.send("evm_mine", []);

    // Try to collect 1 ether - should revert in original (time not passed)
    // But in mutant, block.prevrandao might be > futureUnlockTime, allowing withdrawal
    const collectTx = bank.connect(user).Collect(ethers.parseEther("1.0"));

    // In original: this should revert because block.timestamp < unlockTime
    // In mutant: if block.prevrandao > futureUnlockTime, it will succeed
    // We expect the mutant to NOT revert (killing it)
    await expect(collectTx).to.not.be.reverted;

    // If we get here, the mutant allowed early withdrawal - it's killed
    // Verify balance was reduced
    const holderInfoAfter = await bank.Acc(user.address);
    expect(holderInfoAfter.balance).to.equal(ethers.parseEther("1.0"));
  });
});