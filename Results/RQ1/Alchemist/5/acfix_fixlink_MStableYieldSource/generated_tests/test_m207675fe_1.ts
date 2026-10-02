import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant detection", function () {
  it("should detect mutant m207675fe that replaces division with addition in balanceOfToken", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock savings contract that implements the required interface
    const MockSavingsV2 = await ethers.getContractFactory("MockSavingsV2");
    const mockSavings = await MockSavingsV2.deploy();
    await mockSavings.waitForDeployment();
    
    // Deploy MStableYieldSource with the mock savings contract
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();
    
    // Get the mAsset token address from the savings mock
    const mAssetAddress = await mockSavings.underlying();
    const mAsset = await ethers.getContractAt("IERC20", mAssetAddress);
    
    // Mint tokens to user and approve the yield source
    const depositAmount = ethers.parseEther("100");
    await mAsset.mint(user.address, depositAmount);
    await mAsset.connect(user).approve(await instance.getAddress(), depositAmount);
    
    // Supply tokens to the yield source
    await instance.connect(user).supplyTokenTo(depositAmount, user.address);
    
    // Get the exchange rate from the mock (which returns 1e18 by default)
    const exchangeRate = await mockSavings.exchangeRate();
    
    // Get the imBalance for the user
    const imBalance = await instance.imBalances(user.address);
    
    // Calculate expected balance: (imBalance * exchangeRate) / 1e18
    const expectedBalance = (imBalance * exchangeRate) / BigInt(1e18);
    
    // Call balanceOfToken
    const actualBalance = await instance.balanceOfToken(user.address);
    
    // The original should return expectedBalance
    // The mutant (with + instead of /) would return (imBalance * exchangeRate) + 1e18
    // which is significantly different
    expect(actualBalance).to.equal(expectedBalance);
  });
});