import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m647389cf", function () {
  it("should revert when called from an address greater than the authorized address", async function () {
    // Get signers
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy EBU (no constructor arguments needed as per contract)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // The authorized address is 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // Create a signer with an address slightly higher than the authorized one
    // We can use addr2 and verify its address is higher, or use a custom approach
    
    // Get the current from address from contract to confirm
    const authorizedAddress = await instance.from();
    
    // Find a signer with address > authorizedAddress
    // addr2 should work if its address is higher, otherwise we use owner
    const attacker = addr2.address > authorizedAddress ? addr2 : owner;
    
    // Prepare test data
    const recipients = ["0x0000000000000000000000000000000000000001"];
    const amounts = [1]; // 1 token
    
    // Connect with attacker (address > authorized) and call transfer
    // The original contract should revert because msg.sender != authorized
    // The mutant with >= would allow this call to succeed
    await expect(
      instance.connect(attacker).transfer(recipients, amounts)
    ).to.be.reverted;
  });
});