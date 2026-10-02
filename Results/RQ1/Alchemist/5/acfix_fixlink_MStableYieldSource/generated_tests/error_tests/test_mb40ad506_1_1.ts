import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource mutant kill test - mb40ad506", function () {
  it("should kill mutant by verifying imBalances decreases after redeemToken", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock savings contract that returns predictable values
    const MockSavingsFactory = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await MockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();

    // Deploy a mock ERC20 token
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20Factory.deploy();
    await mockToken.waitForDeployment();

    // Configure mock savings to return our mock token as underlying
    await mockSavings.setUnderlying(mockToken.target);

    // Deploy MStableYieldSource with mock savings
    const MStableYieldSourceFactory = await ethers.getContractFactory("MStableYieldSource");
    const yieldSource = await MStableYieldSourceFactory.deploy(mockSavings.target);
    await yieldSource.waitForDeployment();

    // Get the actual mAsset address (should be our mock token)
    const mAssetAddress = await yieldSource.depositToken();

    // Mint tokens to user and approve yieldSource
    const supplyAmount = ethers.parseEther("100");
    await mockToken.mint(user.address, supplyAmount);
    await mockToken.connect(user).approve(yieldSource.target, supplyAmount);

    // First supply tokens to get imBalances
    await yieldSource.connect(user).supplyTokenTo(supplyAmount, user.address);

    // Get initial imBalances
    const initialBalance = await yieldSource.imBalances(user.address);
    expect(initialBalance).to.be.gt(0);

    // Configure mock savings to return some credits for redeemUnderlying
    const redeemAmount = ethers.parseEther("50");
    const creditsToBurn = ethers.parseEther("50"); // 1:1 ratio for simplicity
    await mockSavings.setRedeemUnderlyingReturn(creditsToBurn);

    // Also set mock token balance for yieldSource to simulate underlying tokens being returned
    await mockToken.mint(yieldSource.target, redeemAmount);

    // Now redeem tokens
    await yieldSource.connect(user).redeemToken(redeemAmount);

    // Check that imBalances decreased - this will fail on mutant since it doesn't deduct
    const finalBalance = await yieldSource.imBalances(user.address);
    expect(finalBalance).to.equal(initialBalance - creditsToBurn);
  });
});