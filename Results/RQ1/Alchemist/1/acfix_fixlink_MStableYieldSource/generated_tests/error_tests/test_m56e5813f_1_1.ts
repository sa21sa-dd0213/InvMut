import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant m56e5813f test", function () {
  it("should detect mutant that removes balanceOfToken implementation", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock savings contract that implements ISavingsContractV2
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContract");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();
    
    // Deploy MStableYieldSource with mock savings
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(mockSavings.target);
    await instance.waitForDeployment();
    
    // Get the mAsset token address from the deployed contract
    const mAssetAddress = await instance.depositToken();
    const mAsset = await ethers.getContractAt("IERC20", mAssetAddress);
    
    // Fund the owner with mAsset tokens
    await mAsset.mint(owner.address, ethers.parseEther("1000"));
    
    // Approve the yield source to spend tokens
    await mAsset.approve(instance.target, ethers.parseEther("1000"));
    
    // Deposit tokens to addr1
    const depositAmount = ethers.parseEther("100");
    await instance.supplyTokenTo(depositAmount, addr1.address);
    
    // Get exchange rate from mock (should return 1e18 for 1:1)
    const exchangeRate = await mockSavings.exchangeRate();
    
    // Calculate expected balance: (creditsIssued * exchangeRate) / 1e18
    // Since mock returns exchangeRate = 1e18, expected = depositAmount
    const expectedBalance = depositAmount;
    
    // Call balanceOfToken - mutant returns 0, original returns correct value
    const actualBalance = await instance.balanceOfToken(addr1.address);
    
    // Assert - will pass on original, fail on mutant (returns 0)
    expect(actualBalance).to.equal(expectedBalance);
  });
});