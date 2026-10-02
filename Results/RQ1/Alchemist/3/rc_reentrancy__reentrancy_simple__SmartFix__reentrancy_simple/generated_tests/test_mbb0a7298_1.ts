import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant mbb0a7298 test", function () {
  it("should detect mutant by calling addToBalance with zero value and expecting success (original) vs revert (mutant)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call addToBalance with msg.value = 0
    // The original contract allows this (>= condition passes)
    // The mutant reverts because 0 > 0 is false
    const tx = await instance.addToBalance({ value: 0 });
    
    // For the original contract this succeeds, for the mutant it reverts
    // We expect success to kill the mutant (mutant would revert)
    await expect(tx).to.not.be.reverted;
    
    // Verify balance is still 0 after the call
    const balance = await instance.getBalance(owner.address);
    expect(balance).to.equal(0);
  });
});