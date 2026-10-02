import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant kill test - balanceOfToken", function () {
  it("should kill mutant mfc6b3bc4 by verifying correct balance calculation with multiplication", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy mock mAsset and savings contract for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mAsset = await MockERC20.deploy("MockAsset", "MA", ethers.parseEther("1000000"));
    await mAsset.waitForDeployment();
    
    const MockSavings = await ethers.getContractFactory("MockSavingsContractV2");
    const savings = await MockSavings.deploy(await mAsset.getAddress());
    await savings.waitForDeployment();
    
    // Deploy MStableYieldSource
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const yieldSource = await Factory.deploy(await savings.getAddress());
    await yieldSource.waitForDeployment();
    
    // Setup: mint tokens to user and approve yieldSource
    await mAsset.mint(user.address, ethers.parseEther("100"));
    await mAsset.connect(user).approve(await yieldSource.getAddress(), ethers.parseEther("100"));
    
    // Supply tokens to create imBalances
    const supplyAmount = ethers.parseEther("10");
    await yieldSource.connect(user).supplyTokenTo(supplyAmount, user.address);
    
    // Get exchange rate from mock (returns 2e18 for testing)
    const exchangeRate = await savings.exchangeRate();
    
    // Calculate expected balance: (imBalances * exchangeRate) / 1e18
    const imBalances = await yieldSource.imBalances(user.address);
    const expectedBalance = (imBalances * exchangeRate) / ethers.parseEther("1");
    
    // Get actual balance from contract
    const actualBalance = await yieldSource.balanceOfToken(user.address);
    
    // Assert the multiplication is correct - mutant would fail here
    // because it would return (imBalances + exchangeRate) / 1e18 instead
    expect(actualBalance).to.equal(expectedBalance);
    
    // Additional assertion to ensure mutant is killed: verify value is reasonable
    // (mutant would produce much smaller value since addition instead of multiplication)
    expect(actualBalance).to.be.gt(ethers.parseEther("0"));
    expect(actualBalance).to.be.lt(ethers.parseEther("100")); // sanity check
  });
});