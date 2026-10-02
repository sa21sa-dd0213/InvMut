import { expect } from "chai";
import { ethers } } from "hardhat";

describe("EBU mutant m646bbd22 test", function () {
  it("should kill the mutant by calling transfer with valid inputs and expecting success", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for EBU)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Verify that the from address is set correctly
    const fromAddress = await instance.from();
    expect(fromAddress).to.equal("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
    
    // Prepare valid transfer parameters
    const recipients = [addr1.address, addr2.address];
    const values = [1, 2]; // 1 and 2 tokens (will be multiplied by 1e18 internally)
    
    // Call transfer from the authorized address (the from address)
    const tx = await instance.connect(owner).transfer(recipients, values);
    
    // Wait for the transaction to complete - it should succeed (not revert)
    await expect(tx).to.not.be.reverted;
  });
});