import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant kill test - balanceOfToken", function () {
  it("should kill mutant m56e5813f by verifying balanceOfToken returns correct value after supply", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock savings contract that implements ISavingsContractV2
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContract");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();
    
    // Deploy a mock ERC20 token
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20Factory.deploy("Mock Token", "MTK");
    await mockToken.waitForDeployment();
    
    // Configure mock savings to return our mock token as underlying
    await mockSavings.setUnderlying(mockToken.target);
    
    // Deploy MStableYieldSource with the mock savings contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(mockSavings.target);
    await instance.waitForDeployment();
    
    // Set exchange rate to 1:1 for simplicity
    await mockSavings.setExchangeRate(ethers.parseEther("1"));
    
    // Mint tokens to addr1 and approve the yield source
    const depositAmount = ethers.parseEther("100");
    await mockToken.mint(addr1.address, depositAmount);
    await mockToken.connect(addr1).approve(instance.target, depositAmount);
    
    // Supply tokens via supplyTokenTo
    await instance.connect(addr1).supplyTokenTo(depositAmount, addr1.address);
    
    // Now call balanceOfToken - should return non-zero value
    const balance = await instance.balanceOfToken(addr1.address);
    
    // With exchange rate 1:1 and deposit of 100 tokens, balance should be 100
    expect(balance).to.equal(depositAmount);
  });
});