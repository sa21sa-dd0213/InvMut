import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m8bd0577c - loop condition change", function () {
  it("should kill mutant by verifying transfers are executed for non-empty _tos array", async function () {
    const [owner, from, to1, to2] = await ethers.getSigners();
    
    // Deploy the demo contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple ERC20 token to use for transferFrom testing
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Mint tokens to the "from" address
    const mintAmount = ethers.parseEther("100");
    await token.mint(from.address, mintAmount);
    
    // Approve the demo contract to spend tokens on behalf of "from"
    await token.connect(from).approve(instance.target, mintAmount);
    
    // Set up the addresses array
    const toAddresses = [to1.address, to2.address];
    const transferAmount = ethers.parseEther("10");
    
    // Record balances before
    const balanceTo1Before = await token.balanceOf(to1.address);
    const balanceTo2Before = await token.balanceOf(to2.address);
    
    // Call the transfer function
    const tx = await instance.transfer(from.address, token.target, toAddresses, transferAmount);
    await tx.wait();
    
    // Check balances after - in original, tokens should be transferred
    // In mutant, loop never executes so no transfers happen
    const balanceTo1After = await token.balanceOf(to1.address);
    const balanceTo2After = await token.balanceOf(to2.address);
    
    // For the original: both recipients should have received tokens
    // For the mutant (i > _tos.length): no transfers, balances unchanged
    expect(balanceTo1After - balanceTo1Before).to.equal(transferAmount);
    expect(balanceTo2After - balanceTo2Before).to.equal(transferAmount);
  });
});