import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant md62a7825 test", function () {
  it("should detect mutant that uses block.prevrandao instead of block.timestamp in Put condition", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract (required before Put can work properly)
    await instance.connect(owner).SetMinSum(ethers.parseEther("0.1"));
    await instance.connect(owner).Initialized();

    // First Put to set initial unlockTime
    const lockTime1 = 100;
    const tx1 = await instance.connect(addr1).Put(lockTime1, { value: ethers.parseEther("1") });
    await tx1.wait();

    // Get the unlockTime after first Put
    const acc1 = await instance.Acc(addr1.address);
    const firstUnlockTime = acc1.unlockTime;

    // Now call Put again with a smaller lockTime that should NOT update unlockTime
    // (since current timestamp + small lockTime <= existing unlockTime)
    const smallLockTime = 1;
    const tx2 = await instance.connect(addr1).Put(smallLockTime, { value: ethers.parseEther("0.5") });
    await tx2.wait();

    // Get the unlockTime after second Put
    const acc2 = await instance.Acc(addr1.address);
    const secondUnlockTime = acc2.unlockTime;

    // In the original contract, the unlockTime should remain the same because
    // block.timestamp + smallLockTime <= firstUnlockTime
    // In the mutant, block.prevrandao is random and could be larger, causing
    // an incorrect update to block.timestamp + smallLockTime
    // This assertion will fail on the mutant if prevrandao happens to be large enough
    // to make the condition true when it shouldn't be
    expect(secondUnlockTime).to.equal(firstUnlockTime);
  });
});