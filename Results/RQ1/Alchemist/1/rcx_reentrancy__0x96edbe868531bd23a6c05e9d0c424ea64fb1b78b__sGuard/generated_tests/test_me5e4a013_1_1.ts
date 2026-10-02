import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant kill test", function () {
  it("should revert Collect when unlock time is not updated due to mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 0 so any amount can be collected
    await instance.SetMinSum(0);

    // Initialize the contract
    await instance.Initialized();

    // First Put with a short lock time (e.g., 100 seconds)
    const shortLock = 100;
    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).Put(shortLock, { value: depositAmount });

    // Get the first unlock time
    const acc1 = await instance.Acc(addr1.address);
    const firstUnlockTime = acc1.unlockTime;

    // Second Put with a longer lock time (e.g., 1000 seconds)
    const longLock = 1000;
    await instance.connect(addr1).Put(longLock, { value: depositAmount });

    // Get the unlock time after second deposit
    const acc2 = await instance.Acc(addr1.address);
    const secondUnlockTime = acc2.unlockTime;

    // On the original contract, unlockTime should be updated to the longer lock
    // On the mutant, unlockTime remains unchanged (firstUnlockTime)

    // Fast forward time to just after the first unlock time but before the second
    await ethers.provider.send("evm_setNextBlockTimestamp", [
      Number(firstUnlockTime) + 1,
    ]);
    await ethers.provider.send("evm_mine");

    // Attempt to collect the full balance
    const totalBalance = ethers.parseEther("2");
    const tx = instance.connect(addr1).Collect(totalBalance);

    // On the original: should revert because unlockTime was updated and hasn't passed yet
    // On the mutant: would succeed because unlockTime wasn't updated and has passed
    await expect(tx).to.be.reverted;
  });
});