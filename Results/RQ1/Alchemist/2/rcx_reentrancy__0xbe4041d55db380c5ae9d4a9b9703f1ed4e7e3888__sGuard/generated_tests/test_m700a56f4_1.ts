import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant test - m700a56f4", function () {
  it("should kill mutant by verifying unlock time is updated with longer lock time", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set minimum sum to 0 so Collect works
    await instance.connect(owner).SetMinSum(0);

    // First Put with short lock time (1 second)
    const shortLockTime = 1;
    const tx1 = await instance.connect(addr1).Put(shortLockTime, { value: ethers.parseEther("1.0") });
    await tx1.wait();

    // Get the unlock time after first Put
    const accAfterFirst = await instance.Acc(addr1.address);
    const unlockTimeAfterFirst = accAfterFirst.unlockTime;

    // Second Put with longer lock time (1 hour)
    const longLockTime = 3600;
    const tx2 = await instance.connect(addr1).Put(longLockTime, { value: ethers.parseEther("1.0") });
    await tx2.wait();

    // Get the unlock time after second Put
    const accAfterSecond = await instance.Acc(addr1.address);
    const unlockTimeAfterSecond = accAfterSecond.unlockTime;

    // In the original contract, the unlock time should be updated to the longer time
    // In the mutant, the unlock time would remain the shorter time (because < condition)
    // The new unlock time should be greater than the old one (since longer lock time)
    expect(unlockTimeAfterSecond).to.be.gt(unlockTimeAfterFirst);
  });
});