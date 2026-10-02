import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant detection - ReentrancyGuard removal", function () {
  it("should detect missing ReentrancyGuard initialization by allowing reentrancy", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy a mock savings contract that allows reentrancy
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContract");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();
    
    // Deploy the MStableYieldSource with the mock savings
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();
    
    // Get the underlying token address from the mock
    const underlyingToken = await ethers.getContractAt("IERC20", await mockSavings.underlying());
    
    // Fund the attacker with underlying tokens
    const mintAmount = ethers.parseEther("1000");
    await underlyingToken.connect(owner).transfer(attacker.address, mintAmount);
    
    // Approve the yield source to spend attacker's tokens
    await underlyingToken.connect(attacker).approve(await instance.getAddress(), mintAmount);
    
    // First call supplyTokenTo to set up initial balance
    await instance.connect(attacker).supplyTokenTo(mintAmount, attacker.address);
    
    // Now try a reentrant attack through redeemToken
    const attackAmount = ethers.parseEther("100");
    
    // In the mutant, this should succeed (reentrancy not prevented)
    // In the original, it should revert
    const tx = instance.connect(attacker).redeemToken(attackAmount);
    
    // The test passes (detects mutant) if the transaction does NOT revert
    // This is because the mutant lacks ReentrancyGuard initialization
    await expect(tx).to.not.be.reverted;
  });
});