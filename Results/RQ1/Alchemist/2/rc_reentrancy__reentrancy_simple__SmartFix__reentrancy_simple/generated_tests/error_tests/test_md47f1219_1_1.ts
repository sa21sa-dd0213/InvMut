import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant md47f1219 test", function () {
  it("should kill the mutant by calling addToBalance with zero value after having a positive balance", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call: add a positive balance (1 wei) to the owner's account
    const tx1 = await instance.addToBalance({ value: ethers.parseEther("0.000000000000000001") });
    await tx1.wait();

    // Verify the balance is now positive
    const balanceAfterFirst = await instance.getBalance(owner.address);
    expect(balanceAfterFirst).to.equal(ethers.parseEther("0.000000000000000001"));

    // Second call: attempt to add zero value - this should pass on original but revert on mutant
    // because original: (positive + 0 >= positive) is true
    // mutant: (positive * 0 >= positive) is false, causing revert
    await expect(
      instance.addToBalance({ value: 0 })
    ).to.be.reverted;
  });
});