import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant kill test - m395a3c5a", function () {
  it("should kill mutant by showing it incorrectly overwrites unlockTime", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 0 so Collect can succeed on amount check
    await instance.connect(owner).SetMinSum(0);
    await instance.connect(owner).Initialized();

    // Step 1: addr1 puts 1 ETH with long lock time (e.g., 1000 seconds)
    const longLock = 1000;
    const putTx1 = await instance.connect(addr1).Put(longLock, { value: ethers.parseEther("1") });
    await putTx1.wait();

    // Record the unlock time after first Put
    const accAfterFirst = await instance.Acc(addr1.address);
    const firstUnlockTime = accAfterFirst.unlockTime;

    // Step 2: addr1 puts 1 ETH with very short lock time (e.g., 1 second)
    const shortLock = 1;
    const putTx2 = await instance.connect(addr1).Put(shortLock, { value: ethers.parseEther("1") });
    await putTx2.wait();

    // Step 3: Check unlockTime after second Put
    const accAfterSecond = await instance.Acc(addr1.address);
    const secondUnlockTime = accAfterSecond.unlockTime;

    // In the ORIGINAL contract, secondUnlockTime should equal firstUnlockTime (the longer one is preserved)
    // In the MUTANT, secondUnlockTime will be overwritten to block.timestamp + shortLock (much smaller)
    // We can detect this by comparing. The mutant will have a smaller unlockTime.
    expect(secondUnlockTime).to.equal(firstUnlockTime, "Mutant killed: unlockTime was incorrectly overwritten");
  });
});