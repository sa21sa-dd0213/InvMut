import { expect } from "chai";
import { ethers } } from "hardhat";

describe("EBU mutant detection - loop condition change", function () {
  it("should detect mutant where loop condition changed from < to > by verifying transfers actually occur", async function () {
    const [owner, from, to1, to2] = await ethers.getSigners();
    
    // Deploy EBU (no constructor arguments needed based on the provided contract)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple ERC20 token to use for transferFrom testing
    const TokenFactory = await ethers.getContractFactory("ERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Mint tokens to the 'from' address and approve the EBU contract
    const mintAmount = ethers.parseEther("100");
    await token.mint(from.address, mintAmount);
    await token.connect(from).approve(instance.target, mintAmount);
    
    // Prepare transfer parameters
    const tos = [to1.address, to2.address];
    const amounts = [ethers.parseEther("10"), ethers.parseEther("20")];
    
    // Get initial balances
    const initialBalance1 = await token.balanceOf(to1.address);
    const initialBalance2 = await token.balanceOf(to2.address);
    
    // Call transfer function
    const tx = await instance.connect(owner).transfer(from.address, token.target, tos, amounts);
    await tx.wait();
    
    // Get final balances
    const finalBalance1 = await token.balanceOf(to1.address);
    const finalBalance2 = await token.balanceOf(to2.address);
    
    // Verify transfers occurred - if mutant is present (loop condition >), no transfers happen
    expect(finalBalance1).to.equal(initialBalance1 + amounts[0]);
    expect(finalBalance2).to.equal(initialBalance2 + amounts[1]);
    
    // Additional check: verify from address lost the tokens
    const fromFinalBalance = await token.balanceOf(from.address);
    expect(fromFinalBalance).to.equal(mintAmount - amounts[0] - amounts[1]);
  });
});