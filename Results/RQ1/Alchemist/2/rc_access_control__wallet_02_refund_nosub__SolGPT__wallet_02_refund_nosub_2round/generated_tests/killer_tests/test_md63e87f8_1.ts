import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant detection - deposit assertion change", function () {
  it("should succeed on deposit with positive amount, killing mutant that changes + to - in assertion", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");
    
    // On the original contract this should succeed.
    // On the mutant, the assertion becomes: balances[msg.sender] - msg.value > balances[msg.sender]
    // which is always false for positive amounts, causing revert.
    await expect(
      instance.connect(owner).deposit({ value: depositAmount })
    ).to.not.be.reverted;
  });
});