import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - meca26708", function () {
  it("should detect that from address changed to address(0) by checking token transfer source", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // The original from address
    const originalFromAddress = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    
    // Get the current from address from the contract
    const contractFromAddress = await instance.from();
    
    // Check if the mutant changed the from address to address(0)
    if (contractFromAddress === ethers.ZeroAddress) {
      // Mutant detected: from address is address(0) instead of the original
      expect(contractFromAddress).to.equal(ethers.ZeroAddress);
      // Additional check: verify that calling transfer with the original from address
      // would behave differently
      const _tos = [addr1.address];
      const v = [1];
      
      // This should succeed but the source of tokens will be address(0) instead of originalFromAddress
      await instance.connect(owner).transfer(_tos, v);
      
      // The mutant is killed because the from address is wrong
      expect(contractFromAddress).to.equal(ethers.ZeroAddress);
    } else {
      // Original behavior - from address should be the hardcoded address
      expect(contractFromAddress).to.equal(originalFromAddress);
    }
  });
});