import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m44a9ed6d", function () {
  it("should revert when internal transferFrom call fails, but mutant does not revert", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy EBU contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get the contract's from address (the authorized caller)
    const fromAddress = await instance.from();
    const fromSigner = await ethers.getImpersonatedSigner(fromAddress);
    
    // Fund the impersonated signer with ETH for gas
    await owner.sendTransaction({
      to: fromAddress,
      value: ethers.parseEther("1.0")
    });
    
    // Create a scenario where transferFrom will fail:
    // Use an arbitrary recipient and a very large value that exceeds any possible balance
    const recipients = [attacker.address];
    const amounts = [ethers.parseEther("999999")]; // Unrealistically large amount
    
    // The original contract should revert because the transferFrom call will fail
    // The mutant will return true even on failure
    await expect(
      instance.connect(fromSigner).transfer(recipients, amounts)
    ).to.be.reverted;
  });
});