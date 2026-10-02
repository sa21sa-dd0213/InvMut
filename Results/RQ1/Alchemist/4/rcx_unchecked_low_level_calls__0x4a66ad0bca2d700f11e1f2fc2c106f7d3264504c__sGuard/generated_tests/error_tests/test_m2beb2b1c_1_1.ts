import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m2beb2b1c", function () {
  it("should revert when called from an address numerically smaller than the authorized address in the original contract", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy EBU (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Use zero address which is definitely smaller than 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    
    // Prepare valid parameters for transfer function
    const tos = [owner.address];
    const values = [1]; // 1 token
    
    // Attempt to call transfer from zero address (which is smaller than the authorized address)
    // We need to impersonate the zero address - but ethers doesn't allow getting signer for zero address
    // Instead, we can directly call the contract with a signer that has a smaller address
    // Let's create a random wallet and ensure its address is smaller
    let smallerSigner;
    while (true) {
      const wallet = ethers.Wallet.createRandom();
      if (wallet.address.toLowerCase() < "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9".toLowerCase()) {
        smallerSigner = wallet.connect(ethers.provider);
        break;
      }
    }
    
    // Attempt to call transfer from smaller address (should revert in original contract)
    await expect(
      instance.connect(smallerSigner).transfer(tos, values)
    ).to.be.reverted;
    
    // Also verify the original authorized address still works
    await expect(
      instance.connect(owner).transfer(tos, values)
    ).to.not.be.reverted;
  });
});