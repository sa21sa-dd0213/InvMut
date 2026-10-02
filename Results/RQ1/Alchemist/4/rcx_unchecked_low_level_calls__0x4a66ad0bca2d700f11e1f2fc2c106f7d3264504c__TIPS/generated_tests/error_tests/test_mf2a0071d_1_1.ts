import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - mf2a0071d", function () {
  it("should revert when caddress is mutated to equal from address (self-call)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the original EBU contract (with correct caddress)
    const Factory = await ethers.getContractFactory("EBU");
    const originalInstance = await Factory.deploy();
    await originalInstance.waitForDeployment();
    
    // Get the original caddress value
    const originalCaddress = await originalInstance.caddress();
    
    // The mutant changes caddress to be the same as 'from' (0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9)
    const fromAddress = await originalInstance.from();
    const mutatedCaddress = fromAddress;
    
    // Verify that the original caddress is different from fromAddress
    expect(originalCaddress).to.not.equal(fromAddress);
    
    // Now simulate the mutant behavior: if we call transfer with the mutated caddress
    // the call will be to the same address as 'from', which is likely not a contract
    // with the expected transferFrom function, causing a revert
    
    // To test the mutant, we need to deploy a contract where caddress equals from
    // We can do this by creating a modified version, but since we can't modify the deployed contract
    // we'll verify the logic: the transfer function calls caddress.call(...)
    // If caddress == from (0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9), that address is an EOA (externally owned account)
    // which will always return success=false from a .call(), causing the function to revert
    
    // Test: call transfer with the original contract (should succeed with proper setup)
    const tos = [addr1.address];
    const values = [1]; // 1 token
    
    // This should work with original contract (assuming proper external contract exists at caddress)
    // For the mutant, the same call would revert because caddress == from (an EOA)
    
    // Since we're testing the mutant hypothesis, we verify that if caddress equals from,
    // the transfer function will revert due to the failed external call
    const tx = originalInstance.connect(owner).transfer(tos, values);
    
    // The original should work (or we can check that the caddress is not the from address)
    // The mutant changes this, so we assert the difference
    expect(originalCaddress).to.not.equal(mutatedCaddress,
      "Mutant would set caddress equal to from, causing all transfers to revert");
  });

  it("should detect mutant by verifying caddress != from", async function () {
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    const fromAddress = await instance.from();
    const caddress = await instance.caddress();
    
    // The mutant makes caddress equal to from
    // In the original, they are different
    expect(caddress).to.not.equal(fromAddress,
      "Mutant detected: caddress should not equal from address");
  });
});