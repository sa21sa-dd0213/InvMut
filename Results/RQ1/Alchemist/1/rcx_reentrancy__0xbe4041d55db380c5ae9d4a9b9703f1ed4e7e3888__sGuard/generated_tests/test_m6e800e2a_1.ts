import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m6e800e2a test", function () {
  it("should detect mutant by checking unlockTime remains unchanged when block.timestamp + _lockTime equals current unlockTime", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, initialize the contract
    await (await instance.connect(owner).Initialized()).wait();

    // Set MinSum to 0 so user can collect
    await (await instance.connect(owner).SetMinSum(0)).wait();

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTime = blockBefore.timestamp;

    // First Put: set unlockTime to currentTime + 100 seconds
    const lockTime1 = 100;
    const expectedUnlockTime = currentTime + lockTime1;
    await (await instance.connect(user).Put(lockTime1, { value: ethers.parseEther("1") })).wait();

    // Verify unlockTime is set correctly
    const holderInfo1 = await instance.Acc(user.address);
    expect(holderInfo1.unlockTime).to.equal(expectedUnlockTime);

    // Second Put: use a _lockTime that makes block.timestamp + _lockTime exactly equal to current unlockTime
    // Get the current block timestamp again
    const blockNumAfter = await ethers.provider.getBlockNumber();
    const blockAfter = await ethers.provider.getBlock(blockNumAfter);
    const newTime = blockAfter.timestamp;

    // Calculate lockTime that would make the sum equal to the existing unlockTime
    // Since time may have advanced, we need to find a lockTime such that:
    // newTime + lockTime = expectedUnlockTime
    // lockTime = expectedUnlockTime - newTime (must be >= 0)
    const lockTime2 = expectedUnlockTime > newTime ? expectedUnlockTime - newTime : 0;

    // Perform second Put with this lockTime
    await (await instance.connect(user).Put(lockTime2, { value: ethers.parseEther("0.5") })).wait();

    // Check that unlockTime remains unchanged (original behavior)
    const holderInfo2 = await instance.Acc(user.address);
    expect(holderInfo2.unlockTime).to.equal(expectedUnlockTime);

    // Verify balance increased (Put still works)
    expect(holderInfo2.balance).to.equal(ethers.parseEther("1.5"));
  });
});