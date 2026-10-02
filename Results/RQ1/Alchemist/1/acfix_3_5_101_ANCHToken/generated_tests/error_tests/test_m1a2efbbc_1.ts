import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant m1a2efbbc - _getRate return removal", function () {
  it("should detect the mutant by verifying balance changes after a transfer from an allowed role", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract - need a router and USD token address
    // For testing purposes, we'll use a mock router address
    const mockRouterAddress = "0x0000000000000000000000000000000000000001";
    const mockUSDTokenAddress = "0x0000000000000000000000000000000000000002";
    
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(mockRouterAddress, mockUSDTokenAddress);
    await instance.waitForDeployment();
    
    // Get the initial balance of addr1
    const initialBalance = await instance.balanceOf(addr1.address);
    
    // The contract doesn't have a function to set allowed roles directly
    // We need to check if the owner (who deployed) is considered an allowed role
    // Let's try to perform a transfer from owner to addr1
    const transferAmount = ethers.parseEther("100");
    
    // First, let's check if the owner has tokens
    const ownerBalance = await instance.balanceOf(owner.address);
    console.log("Owner balance:", ownerBalance.toString());
    
    // Try to transfer from owner to addr1
    // If the owner is not an allowed role, this will revert with "Unauthorized role"
    try {
      const tx = await instance.connect(owner).transfer(addr1.address, transferAmount);
      await tx.wait();
      
      // If transfer succeeds, check if balance changed correctly
      const finalBalance = await instance.balanceOf(addr1.address);
      console.log("Final balance:", finalBalance.toString());
      
      // With the mutant, _getRate returns 0, so the transfer won't update balances correctly
      // The balance should have increased by the transfer amount
      // But with the mutant, it won't because rAmount = tAmount * 0 = 0
      expect(finalBalance).to.equal(initialBalance + transferAmount);
      
    } catch (error: any) {
      // If the transfer reverts because of unauthorized role, we need to set an allowed role
      // The contract doesn't have a public function to set allowed roles
      // Let's check if the contract has any other way to handle this
      console.log("Transfer failed:", error.message);
      
      // Alternative approach: check if the contract's balance tracking works
      // by calling tokenFromReflection which uses _getRate
      const reflectionBalance = await instance.tokenFromReflection(
        await instance._rOwned(addr1.address)
      );
      
      // With the mutant, _getRate returns 0, so tokenFromReflection will revert with division by zero
      // This should kill the mutant
      expect(reflectionBalance).to.not.be.reverted;
    }
  });
});