import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m9a684abb test", function () {
  it("should kill mutant that changed >= to <= in distributeToken balance check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with liquidity receive address
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(addr1.address);
    await instance.waitForDeployment();
    
    // Set distribute address via onlyCaller - need to set caller first
    await instance.setCaller(owner.address);
    await instance.setDistributeAddress(addr1.address);
    
    // Get current balance of contract
    const contractBalance = await instance.balanceOf(await instance.getAddress());
    
    // If balance is less than distributeAmount, mint more tokens to contract
    const distributeAmount = ethers.parseEther("2000");
    if (contractBalance < distributeAmount) {
      // Transfer tokens to contract to exceed distributeAmount
      await instance.transfer(await instance.getAddress(), distributeAmount + ethers.parseEther("1"));
    }
    
    // Now contract balance should be > distributeAmount
    const updatedBalance = await instance.balanceOf(await instance.getAddress());
    expect(updatedBalance).to.be.gt(distributeAmount);
    
    // This should succeed on original (balance >= distributeAmount)
    // but fail on mutant (balance <= distributeAmount is false when balance > distributeAmount)
    await expect(instance.distributeToken()).to.not.be.reverted;
    
    // Verify the transfer happened
    const finalContractBalance = await instance.balanceOf(await instance.getAddress());
    const addr1Balance = await instance.balanceOf(addr1.address);
    expect(finalContractBalance).to.equal(updatedBalance - distributeAmount);
    expect(addr1Balance).to.equal(distributeAmount);
  });
});