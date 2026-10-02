import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant detection - asset address", function () {
  it("should detect mutant that sets asset to address(this) instead of asset_", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token to use as the asset
    const MockToken = await ethers.getContractFactory("MockERC20");
    const assetToken = await MockToken.deploy("Test Token", "TST", 18);
    await assetToken.waitForDeployment();
    
    // Deploy a mock share token (TrancheTokenLike)
    const ShareFactory = await ethers.getContractFactory("MockTrancheToken");
    const shareToken = await ShareFactory.deploy("Tranche Token", "TRN", 18);
    await shareToken.waitForDeployment();
    
    // Deploy a mock InvestmentManager
    const IMFactory = await ethers.getContractFactory("MockInvestmentManager");
    const investmentManager = await IMFactory.deploy();
    await investmentManager.waitForDeployment();
    
    // Deploy LiquidityPool with the actual asset token address
    const poolId = 1;
    const trancheId = ethers.hexlify(ethers.randomBytes(16));
    const LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPool");
    const pool = await LiquidityPoolFactory.deploy(
      poolId,
      trancheId,
      await assetToken.getAddress(),
      await shareToken.getAddress(),
      await investmentManager.getAddress()
    );
    await pool.waitForDeployment();
    
    // Get the asset address from the pool
    const poolAsset = await pool.asset();
    
    // The asset should be the token address we passed in, NOT the pool's own address
    const poolAddress = await pool.getAddress();
    
    // If the mutant is active, asset() will return poolAddress instead of assetToken address
    expect(poolAsset).to.not.equal(poolAddress);
    expect(poolAsset).to.equal(await assetToken.getAddress());
  });
});