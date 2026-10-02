import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m8f396d3b test", function () {
  it("should kill mutant by verifying token transfer originates from correct 'from' address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the EBU contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the original 'from' address that should be used in transferFrom calls
    const originalFrom = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";
    
    // Get the caddress from the contract
    const caddress = await instance.caddress();
    
    // Deploy a mock token that tracks transferFrom calls
    const MockToken = await ethers.getContractFactory("MockToken");
    const mockToken = await MockToken.deploy(originalFrom);
    await mockToken.waitForDeployment();
    
    // Prepare test data
    const recipients = [addr1.address];
    const amounts = [1]; // 1 token (will be multiplied by 1e18)
    
    // Impersonate the authorized sender
    await ethers.provider.send("hardhat_impersonateAccount", [originalFrom]);
    
    const signer = await ethers.getSigner(originalFrom);
    
    // Fund the signer with some ETH for gas
    await owner.sendTransaction({
      to: originalFrom,
      value: ethers.parseEther("1.0")
    });
    
    // Call transfer - in the mutant, this will use the wrong 'from' address
    const tx = await instance.connect(signer).transfer(recipients, amounts);
    await tx.wait();
    
    // Verify that transferFrom was called with correct from address
    const calledFrom = await mockToken.lastFrom();
    expect(calledFrom).to.equal(originalFrom, "transferFrom was called with wrong 'from' address");
    
    // Stop impersonation
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [originalFrom]);
  });
});