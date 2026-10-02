import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m2beb2b1c", function () {
  it("should revert when called from an address numerically smaller than the authorized address in the original contract", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    
    // Deploy EBU (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Create an address that is numerically smaller than 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // Using a random signer address that will be compared numerically
    const smallerAddress = ethers.Wallet.createRandom().address;
    
    // Ensure the address is actually smaller (we can't guarantee this with random, so use a known smaller address)
    // The authorized address is 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We'll use the zero address which is definitely smaller
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    
    // Prepare valid parameters for transfer function
    const tos = [unauthorized.address];
    const values = [1]; // 1 token
    
    // Attempt to call transfer from zero address (which is smaller than the authorized address)
    // In the original contract this should revert, in the mutant it would pass (<= check)
    await expect(
      instance.connect(await ethers.getImpersonatedSigner(zeroAddress)).transfer(tos, values)
    ).to.be.reverted;
    
    // Also verify the original authorized address still works
    await expect(
      instance.connect(owner).transfer(tos, values)
    ).to.not.be.reverted;
  });
});