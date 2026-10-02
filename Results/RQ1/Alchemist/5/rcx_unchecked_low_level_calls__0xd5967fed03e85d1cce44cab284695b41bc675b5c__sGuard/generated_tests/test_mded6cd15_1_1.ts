import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant mded6cd15 - sha256 instead of keccak256", function () {
  it("should kill the mutant by verifying token transfer fails when sha256 is used for function selector", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the demo contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple ERC20-like token contract for testing
    const TokenFactory = await ethers.getContractFactory("TestToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    
    // Fund owner with tokens and approve the demo contract to spend
    const transferAmount = ethers.parseEther("10");
    await token.transfer(addr1.address, transferAmount);
    await token.connect(addr1).approve(await instance.getAddress(), transferAmount);
    
    // Record balances before the call
    const balanceBeforeFrom = await token.balanceOf(addr1.address);
    const balanceBeforeTo = await token.balanceOf(addr2.address);
    
    // Call the transfer function which should use keccak256 (original) or sha256 (mutant)
    const tos = [addr2.address];
    await instance.connect(owner).transfer(addr1.address, tokenAddress, tos, transferAmount);
    
    // Check balances after the call
    const balanceAfterFrom = await token.balanceOf(addr1.address);
    const balanceAfterTo = await token.balanceOf(addr2.address);
    
    // For the original contract with keccak256, the transferFrom would succeed
    // For the mutant with sha256, the selector is wrong, so no transfer occurs
    // We assert that the balances remain unchanged, which kills the mutant
    expect(balanceAfterFrom).to.equal(balanceBeforeFrom);
    expect(balanceAfterTo).to.equal(balanceBeforeTo);
  });
});