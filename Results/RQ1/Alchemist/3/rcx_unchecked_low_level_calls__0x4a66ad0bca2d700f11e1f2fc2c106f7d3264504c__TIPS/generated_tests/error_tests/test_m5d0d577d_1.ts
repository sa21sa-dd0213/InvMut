import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m5d0d577d", function () {
  it("should kill mutant by calling transfer from address with higher numeric value than allowed", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed for EBU)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get a signer whose address is numerically greater than the hardcoded 'from' address
    // The original 'from' address is 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We'll use addr1 which has a higher numeric address value
    // addr1 is typically 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 - we need to check if it's greater
    // If not, we can create a wallet with a higher address
    
    // Actually, let's use a signer with address greater than the hardcoded one
    // The hardcoded address is 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We'll use the owner which is typically 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (greater)
    // But owner equals the hardcoded from address? No, they're different.
    // Let's use a signer that is definitely greater: the owner (0xf39Fd6...2266 > 0x979705...6c9)
    
    // Prepare test data
    const tos = [addr2.address];
    const values = [1]; // 1 token
    
    // Call transfer from an address that is numerically greater than 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // This should pass on the mutant (>=) but revert on the original (==)
    // The owner address 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 is numerically greater
    
    await expect(
      instance.connect(owner).transfer(tos, values)
    ).to.be.reverted; // Should revert because owner != 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    
    // Note: In the original contract, only msg.sender == 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9 passes
    // In the mutant, msg.sender >= 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9 passes
    // Since owner's address (0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266) > hardcoded address,
    // the mutant would allow it, but original would revert
    // So expecting revert kills the mutant (mutant would NOT revert, test fails)
  });
});