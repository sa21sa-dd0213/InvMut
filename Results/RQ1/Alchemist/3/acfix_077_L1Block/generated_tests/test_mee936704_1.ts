import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant detection - DEPOSITOR_ACCOUNT constant", function () {
  it("should detect mutant that changes DEPOSITOR_ACCOUNT from hardcoded address to address(this)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The expected DEPOSITOR_ACCOUNT value from the original contract
    const expectedDepositorAccount = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";
    
    // Get the actual DEPOSITOR_ACCOUNT value from the contract
    const actualDepositorAccount = await instance.DEPOSITOR_ACCOUNT();
    
    // Assert that DEPOSITOR_ACCOUNT equals the original hardcoded address
    // This will pass on the original but fail on the mutant where it equals address(this)
    expect(actualDepositorAccount).to.equal(expectedDepositorAccount);
    
    // Additional verification: the contract's own address should NOT equal DEPOSITOR_ACCOUNT
    const contractAddress = await instance.getAddress();
    expect(contractAddress).to.not.equal(expectedDepositorAccount);
  });
});