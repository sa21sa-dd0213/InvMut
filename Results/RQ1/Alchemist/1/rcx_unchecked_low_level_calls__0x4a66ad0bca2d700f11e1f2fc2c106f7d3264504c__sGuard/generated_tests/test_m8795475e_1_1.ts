import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m8795475e", function () {
  it("should detect that caddress was changed from the original contract address to the from address", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the contract addresses
    const fromAddress = await instance.from();
    const caddress = await instance.caddress();
    
    // In the original, caddress should be different from fromAddress
    // In the mutant, caddress equals fromAddress
    // This test will detect the mutant because the assertion will fail on mutant
    expect(caddress).to.not.equal(fromAddress);
    
    // Additionally, test that the transfer function works correctly
    // Create arrays for the test call
    const recipients = [addr1.address, addr2.address];
    const values = [1, 2];
    
    // Call transfer from the authorized sender (owner in this case since from = owner)
    const tx = await instance.connect(owner).transfer(recipients, values);
    const receipt = await tx.wait();
    
    // The transaction should succeed (not revert) in both original and mutant
    expect(receipt.status).to.equal(1);
  });
});