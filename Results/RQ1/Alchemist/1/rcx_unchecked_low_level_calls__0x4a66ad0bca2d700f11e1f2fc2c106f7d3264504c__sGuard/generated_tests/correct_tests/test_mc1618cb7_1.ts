import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - stateVariable replacement", function () {
  it("should detect that from address is contract address instead of hardcoded address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the contract's own address
    const contractAddress = await instance.getAddress();
    
    // Check the 'from' state variable
    const fromAddress = await instance.from();
    
    // In the original, from should be 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // In the mutant, from should be the contract's own address
    const originalFromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    
    // If the mutant is present, from will equal contractAddress
    // If the original is present, from will equal originalFromAddress
    // This test will fail on the mutant because the assertion will pass unexpectedly
    // Actually, we want the test to FAIL on the mutant (kill it)
    // So we assert that from equals the original hardcoded address
    expect(fromAddress).to.equal(originalFromAddress);
  });
});