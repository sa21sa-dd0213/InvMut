import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant mb5d48afb test", function () {
  it("should detect the mutant by verifying unlockTime is based on block.timestamp, not block.prevrandao", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 0 so any amount can be collected
    await instance.SetMinSum(0);
    // Initialize the contract
    await instance.Initialized();

    // Put 1 ether with lockTime = 100 seconds
    const lockTime = 100;
    const putAmount = ethers.parseEther("1");
    await instance.connect(addr1).Put(lockTime, { value: putAmount });

    // Get the current block timestamp
    const blockBefore = await ethers.provider.getBlock("latest");
    const expectedUnlockTime = blockBefore.timestamp + lockTime;

    // Check that unlockTime was set correctly (based on block.timestamp)
    const acc = await instance.Acc(addr1.address);
    expect(acc.unlockTime).to.equal(expectedUnlockTime);

    // Try to collect immediately - should revert because unlockTime hasn't passed
    await expect(
      instance.connect(addr1).Collect(putAmount)
    ).to.be.reverted;

    // Wait until just before unlockTime (minus 1 second for safety)
    await ethers.provider.send("evm_setNextBlockTimestamp", [expectedUnlockTime - 1]);
    await ethers.provider.send("evm_mine", []);

    // Should still revert because time hasn't passed
    await expect(
      instance.connect(addr1).Collect(putAmount)
    ).to.be.reverted;

    // Now advance past unlockTime
    await ethers.provider.send("evm_setNextBlockTimestamp", [expectedUnlockTime + 1]);
    await ethers.provider.send("evm_mine", []);

    // Should succeed now
    await expect(
      instance.connect(addr1).Collect(putAmount)
    ).to.not.be.reverted;
  });
});