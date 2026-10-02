import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m4ab33664", function () {
  it("should revert when calling transfer with non-empty array on mutant but succeed on original", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the EBU contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Prepare test data: non-empty array of recipients and corresponding values
    const recipients = [addr1.address];
    const values = [1]; // 1 token
    
    // The from address is hardcoded in the contract as 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // Only that address can call transfer (msg.sender check)
    const fromSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");
    
    // This should succeed on original (require(_tos.length > 0) passes)
    // On mutant (require(_tos.length < 0)), it will always revert since length is never negative
    await expect(
      instance.connect(fromSigner).transfer(recipients, values)
    ).to.be.reverted;
  });
});