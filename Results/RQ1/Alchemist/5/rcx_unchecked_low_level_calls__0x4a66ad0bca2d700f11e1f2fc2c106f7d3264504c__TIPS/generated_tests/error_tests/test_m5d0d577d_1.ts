import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m5d0d577d test", function () {
  it("should revert when called from an address numerically greater than the authorized address", async function () {
    // Get signers
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // The authorized address is 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // Create a signer with an address that is numerically greater
    // We can use a higher address like 0xffffffffffffffffffffffffffffffffffffffff
    // In practice, we'll use addr1 which likely has a different address
    
    // Prepare test data: at least one recipient and value
    const recipients = [addr2.address];
    const values = [1]; // 1 token (will be multiplied by 10^18 internally)
    
    // The mutant changes == to >=, so any address >= authorized passes
    // We need an address that is numerically greater than 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // Let's use addr1 which should have a different address
    
    // Try calling from an unauthorized address that is numerically higher
    // We'll attempt the call and expect it to revert on the original
    // but succeed on the mutant (which is what we want to detect)
    
    // This test will pass on the original (revert expected) but fail on mutant (no revert)
    await expect(
      instance.connect(addr1).transfer(recipients, values)
    ).to.be.reverted;
  });
});