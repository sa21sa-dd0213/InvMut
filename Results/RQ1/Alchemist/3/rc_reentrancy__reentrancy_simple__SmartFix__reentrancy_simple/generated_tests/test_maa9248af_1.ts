import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant maa9248af detection", function () {
  it("should detect mutant that removes return statement from getBalance", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 1 ether into the contract
    const depositAmount = ethers.parseEther("1.0");
    const tx = await instance.addToBalance({ value: depositAmount });
    await tx.wait();

    // Call getBalance and verify it returns the deposited amount
    const balance = await instance.getBalance(owner.address);
    expect(balance).to.equal(depositAmount);
  });
});