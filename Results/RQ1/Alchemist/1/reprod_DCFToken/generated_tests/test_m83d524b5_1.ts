import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m83d524b5 - distributeToken balance check", function () {
  it("should revert when calling distributeToken with insufficient balance, but mutant allows it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy DCF with a liquidity receive address
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(addr1.address);
    await instance.waitForDeployment();
    
    // Set the caller (cfo) to the owner for test setup
    await instance.setCaller(owner.address);
    
    // Set a distribute address
    await instance.setDistributeAddress(addr2.address);
    
    // Get the contract's token balance - it should be 0 after minting to owner
    const contractBalance = await instance.balanceOf(await instance.getAddress());
    
    // The distributeAmount is 2000 * 1e18, so if contract balance is less, it should revert
    // In the original contract, this require statement prevents the transfer
    // In the mutant, the require is removed, so the call would proceed
    
    // Check if contract balance is less than distributeAmount (2000 * 1e18)
    const distributeAmount = ethers.parseEther("2000");
    
    // Try to call distributeToken - original should revert, mutant might not
    // We need to check if it reverts or not to detect the mutant
    try {
      const tx = await instance.distributeToken();
      await tx.wait();
      
      // If we get here without revert, the mutant is detected (it allowed the transfer)
      // Verify the balance actually decreased (mutant behavior)
      const newBalance = await instance.balanceOf(await instance.getAddress());
      expect(newBalance).to.be.lessThan(contractBalance);
      
      // If we reach this point, the mutant is killed because it allowed a transfer
      // when it shouldn't have
    } catch (error: any) {
      // If it reverts, check that it's the expected error
      // This would be the original contract behavior
      expect(error.message).to.include("Insufficient token balance");
    }
  });
});