import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant kill test - md47f1219", function () {
  it("should kill mutant by calling addToBalance with zero value after a prior deposit", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First deposit some ether to give owner a non-zero balance
    const depositAmount = ethers.parseEther("1.0");
    const tx1 = await instance.connect(owner).addToBalance({ value: depositAmount });
    await tx1.wait();

    // Now call addToBalance with zero value - should succeed on original but revert on mutant
    const tx2 = instance.connect(owner).addToBalance({ value: 0 });
    await expect(tx2).to.be.reverted;
  });
});