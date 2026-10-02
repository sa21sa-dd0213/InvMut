import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource - balanceOfToken mutant detection", function () {
  it("should detect the mutant that replaces division with addition in balanceOfToken", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token to use as the underlying mAsset
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Mock Token", "MTK", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();
    
    // Deploy a mock savings contract that implements the required interface
    const MockSavingsContract = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavingsContract.deploy(await mockToken.getAddress());
    await mockSavings.waitForDeployment();
    
    // Deploy MStableYieldSource with the mock savings contract
    const MStableYieldSource = await ethers.getContractFactory("MStableYieldSource");
    const yieldSource = await MStableYieldSource.deploy(await mockSavings.getAddress());
    await yieldSource.waitForDeployment();
    
    // Setup: Transfer some tokens to user and approve yieldSource
    const depositAmount = ethers.parseEther("100");
    await mockToken.transfer(user.address, depositAmount);
    await mockToken.connect(user).approve(await yieldSource.getAddress(), depositAmount);
    
    // Call supplyTokenTo to deposit tokens and get credits
    await yieldSource.connect(user).supplyTokenTo(depositAmount, user.address);
    
    // The exchange rate is 1:1 in our mock, so imBalances[user] should equal depositAmount
    // Original: balance = (imBalances[addr] * exchangeRate) / 1e18 = depositAmount * 1e18 / 1e18 = depositAmount
    // Mutant: balance = (imBalances[addr] * exchangeRate) + 1e18 = depositAmount * 1e18 + 1e18 = depositAmount * 1e18 + 1e18
    
    // Call balanceOfToken and verify the result matches the original formula
    const balance = await yieldSource.balanceOfToken(user.address);
    
    // The original formula would return depositAmount (100 tokens)
    // The mutant would return depositAmount * 1e18 + 1e18, which is astronomically larger
    // We expect the correct value to be exactly depositAmount
    expect(balance).to.equal(depositAmount);
  });
});