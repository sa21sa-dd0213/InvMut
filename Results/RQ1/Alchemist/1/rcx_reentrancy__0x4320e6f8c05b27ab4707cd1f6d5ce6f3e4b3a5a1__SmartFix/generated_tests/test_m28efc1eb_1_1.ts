import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant m28efc1eb detection", function () {
  it("should kill mutant by detecting that SetMinSum can be called after initialization", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial MinSum is 1 ether
    const initialMinSum = await instance.MinSum();
    expect(initialMinSum).to.equal(ethers.parseEther("1"));

    // Call Initialized() to set intitalized = true
    await (await instance.Initialized()).wait();

    // Try to call SetMinSum with a new value - this should revert in original
    // but succeed in mutant because guard is disabled
    const newMinSum = ethers.parseEther("2");
    
    // In the original contract this would revert, but in the mutant it succeeds
    await (await instance.SetMinSum(newMinSum)).wait();

    // Verify the value was actually changed (mutant allows this after initialization)
    const updatedMinSum = await instance.MinSum();
    expect(updatedMinSum).to.equal(newMinSum);
  });
});