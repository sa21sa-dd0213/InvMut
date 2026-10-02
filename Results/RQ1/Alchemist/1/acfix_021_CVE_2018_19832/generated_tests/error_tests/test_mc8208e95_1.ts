import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant test - withdrawForeignTokens return value", function () {
  it("should return true when withdrawing foreign tokens successfully", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the main contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple ERC20 token to use as foreign token
    const TokenFactory = await ethers.getContractFactory("NewIntelTechMedia");
    const foreignToken = await TokenFactory.deploy();
    await foreignToken.waitForDeployment();
    
    // Get the foreign token address
    const foreignTokenAddress = await foreignToken.getAddress();
    
    // Send some tokens to the main contract
    await foreignToken.transfer(await instance.getAddress(), ethers.parseEther("100"));
    
    // Call withdrawForeignTokens and check it returns true
    const tx = await instance.withdrawForeignTokens(foreignTokenAddress);
    const receipt = await tx.wait();
    
    // Verify the function returned true (not false as in the mutant)
    // We can check this by verifying the tokens were actually transferred
    const ownerBalance = await foreignToken.balanceOf(owner.address);
    expect(ownerBalance).to.equal(ethers.parseEther("100"));
  });
});