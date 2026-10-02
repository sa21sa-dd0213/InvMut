import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant detection test", function () {
  it("should kill mutant me1f4e7c2 by sending non-zero ether to addToBalance", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const initialBalance = await instance.getBalance(owner.address);
    const depositAmount = ethers.parseEther("1.0");

    // This transaction should succeed on original but revert on mutant
    await expect(
      instance.addToBalance({ value: depositAmount })
    ).to.not.be.reverted;

    const finalBalance = await instance.getBalance(owner.address);
    expect(finalBalance).to.equal(initialBalance + depositAmount);
  });
});