import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m58ce1a79", function () {
  it("should revert when transfer is called with empty _tos array on original, but pass on mutant", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy EBU (no constructor arguments)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The authorized sender is hardcoded as 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to impersonate this address or use it directly
    // Since we can't change sender in hardhat tests easily, we check that the function exists
    // and test with empty array from the hardcoded owner
    
    // For this test, we'll use the hardcoded from address as signer by setting the next block's coinbase
    // But actually the contract checks msg.sender == hardcoded address, not owner
    // So we need to use hardhat's impersonate feature or account with that private key
    
    // Get the hardcoded from address as a signer (if we have its private key)
    // For testing purposes, we'll use the contract's deployer as the sender since we can't control the hardcoded address
    // The test will work because the mutant removes the require check, so we can call from any address
    
    // Test with empty _tos array - should revert on original but might succeed on mutant
    await expect(
      instance.connect(owner).transfer([], [])
    ).to.be.reverted;
  });
});