import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant test - deposit with zero value", function () {
  it("should kill mutant m9f608212 by calling deposit with msg.value = 0", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Calling deposit with 0 value should succeed in original (assert passes)
    // but should revert in mutant (assert fails because 0 * balance > balance is false)
    const tx = await instance.connect(owner).deposit({ value: 0 });
    
    // If the transaction does not revert, the mutant is killed (original would succeed)
    await expect(tx).to.not.be.reverted;
  });
});