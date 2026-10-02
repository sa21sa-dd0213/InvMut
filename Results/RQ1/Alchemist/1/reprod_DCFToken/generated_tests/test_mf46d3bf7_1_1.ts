import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant kill test - mf46d3bf7", function () {
  it("should revert when balance is greater than distributeAmount due to <= mutant", async function () {
    const [owner, addr1, liquidityReceiver] = await ethers.getSigners();
    
    // Deploy DCF with liquidity receive address
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiver.address);
    await instance.waitForDeployment();
    
    // Get the contract address
    const contractAddress = await instance.getAddress();
    
    // Get the helper contract address
    const helperAddress = await instance.helperAddress();
    
    // Set the caller (cfo) to owner for testing
    await instance.setCaller(owner.address);
    
    // Set distribute address to addr1
    await instance.setDistributeAddress(addr1.address);
    
    // Transfer tokens to the contract to have balance > distributeAmount
    const distributeAmount = ethers.parseEther("2000");
    const transferAmount = ethers.parseEther("3000"); // Greater than distributeAmount
    
    // First mint tokens to owner so they have enough to transfer
    // Owner already has initial supply from constructor
    
    // Transfer tokens from owner to contract
    await instance.transfer(contractAddress, transferAmount);
    
    // Verify contract balance is greater than distributeAmount
    const contractBalance = await instance.balanceOf(contractAddress);
    expect(contractBalance).to.be.gt(distributeAmount);
    
    // Call distributeTokenPeriodic - this should revert on the mutant
    // because the mutant has require(balance <= distributeAmount) instead of >=
    await expect(
      instance.connect(owner).distributeTokenPeriodic()
    ).to.be.revertedWith("Insufficient token balance");
  });
});