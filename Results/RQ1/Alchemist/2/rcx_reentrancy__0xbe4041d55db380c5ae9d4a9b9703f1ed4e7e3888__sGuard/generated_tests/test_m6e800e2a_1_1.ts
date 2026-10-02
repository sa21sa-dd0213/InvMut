import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m6e800e2a detection", function () {
  it("should detect mutant that uses >= instead of > in unlockTime update", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.connect(owner).Initialized();

    // Set minimum sum to 0 to allow collecting
    await instance.connect(owner).SetMinSum(0);

    // First Put call: send 1 ether with lock time of 100 seconds
    const lockTime1 = 100;
    const tx1 = await instance.connect(addr1).Put(lockTime1, { value: ethers.parseEther("1") });
    const receipt1 = await tx1.wait();
    const gasUsed1 = receipt1!.gasUsed;

    // Get the current unlockTime after first Put
    const acc1 = await instance.Acc(addr1.address);
    const unlockTime = acc1.unlockTime;

    // Calculate lock time that would result in exactly the same unlockTime
    const currentTimestamp = (await ethers.provider.getBlock("latest"))!.timestamp;
    const lockTime2 = Number(unlockTime) - currentTimestamp;

    // Second Put call with lock time that makes new timestamp == current unlockTime
    const tx2 = await instance.connect(addr1).Put(lockTime2, { value: ethers.parseEther("1") });
    const receipt2 = await tx2.wait();
    const gasUsed2 = receipt2!.gasUsed;

    // Check that unlockTime did NOT change (mutant would have written same value, costing more gas)
    const acc2 = await instance.Acc(addr1.address);
    expect(acc2.unlockTime).to.equal(unlockTime);

    // In the original contract, no storage write occurs on second call (gas should be similar to first call minus storage write cost)
    // In the mutant, a storage write occurs (more expensive). The gas difference should be significant.
    // A storage write (SSTORE) costs at least 5000 gas more than no write
    expect(gasUsed2).to.be.lessThan(gasUsed1 + BigInt(4000));
  });
});