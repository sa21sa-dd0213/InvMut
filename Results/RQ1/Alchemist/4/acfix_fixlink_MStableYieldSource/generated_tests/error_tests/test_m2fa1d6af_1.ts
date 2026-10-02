import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource - Kill mutant m2fa1d6af (missing ReentrancyGuard initialization)", function () {
  it("should detect missing ReentrancyGuard initialization by attempting reentrancy", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock savings contract that allows reentrancy testing
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();
    
    // Deploy the MStableYieldSource with the mock savings
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();
    
    // Fund the contract with some tokens for testing
    const mockToken = await ethers.getContractAt("IERC20", await mockSavings.underlying());
    
    // First, approve and supply tokens to set up balances
    await mockToken.approve(await instance.getAddress(), ethers.parseEther("100"));
    await instance.connect(addr1).supplyTokenTo(ethers.parseEther("10"), addr1.address);
    
    // Get initial balance
    const initialBalance = await mockToken.balanceOf(addr1.address);
    
    // Attempt reentrancy: call redeemToken which should be protected by nonReentrant
    // If ReentrancyGuard is not initialized, the reentrancy protection may fail
    const maliciousContractFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attacker = await maliciousContractFactory.deploy(await instance.getAddress());
    await attacker.waitForDeployment();
    
    // Fund attacker with tokens
    await mockToken.transfer(await attacker.getAddress(), ethers.parseEther("5"));
    await mockToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // The attacker contract will attempt to re-enter redeemToken
    // If ReentrancyGuard is not initialized, the second call might succeed (killing the mutant)
    // If properly initialized, the second call should revert
    await expect(
      attacker.connect(addr1).attack(ethers.parseEther("1"))
    ).to.be.reverted;
    
    // Verify state consistency after the attack attempt
    const finalBalance = await mockToken.balanceOf(addr1.address);
    expect(finalBalance).to.equal(initialBalance);
  });
});

// Helper contracts for testing (deploy these alongside)
// MockSavingsContractV2 - simple mock that allows reentrancy
// ReentrancyAttacker - contract that attempts reentrant call