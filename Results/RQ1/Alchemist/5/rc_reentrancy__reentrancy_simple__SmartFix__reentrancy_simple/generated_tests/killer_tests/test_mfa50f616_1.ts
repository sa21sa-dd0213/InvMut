import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant kill test", function () {
  it("should kill mutant mfa50f616 by sending non-zero ether and expecting balance increase", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const initialBalance = await instance.getBalance(owner.address);
    const depositAmount = ethers.parseEther("1");

    // On original: succeeds and balance increases
    // On mutant: require fails (balance + amount <= balance is false), tx reverts
    const tx = await instance.addToBalance({ value: depositAmount });

    // Wait for the transaction to be mined
    await tx.wait();

    // Check that the balance increased (should fail on mutant because it reverted)
    const finalBalance = await instance.getBalance(owner.address);
    expect(finalBalance).to.equal(initialBalance + depositAmount);
  });
});