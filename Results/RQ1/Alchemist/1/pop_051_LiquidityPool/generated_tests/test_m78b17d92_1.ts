import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant m78b17d92 - allowance return value", function () {
  it("should return the correct allowance value, not zero", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the LiquidityPool with required constructor arguments
    // Constructor: (uint64 poolId_, bytes16 trancheId_, address asset_, address share_, address investmentManager_)
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("tranche1");
    
    // We need mock contracts for asset, share, and investmentManager
    // Deploy a minimal ERC20 mock for asset
    const AssetFactory = await ethers.getContractFactory("ERC20Mock");
    const asset = await AssetFactory.deploy("Asset", "AST", 18);
    await asset.waitForDeployment();
    
    // Deploy a mock for share (TrancheTokenLike)
    const ShareFactory = await ethers.getContractFactory("TrancheTokenMock");
    const share = await ShareFactory.deploy("Share", "SHR", 18);
    await share.waitForDeployment();
    
    // Deploy a mock for investmentManager
    const InvestmentManagerFactory = await ethers.getContractFactory("InvestmentManagerMock");
    const investmentManager = await InvestmentManagerFactory.deploy();
    await investmentManager.waitForDeployment();
    
    // Deploy LiquidityPool
    const LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPool");
    const pool = await LiquidityPoolFactory.deploy(
      poolId,
      trancheId,
      await asset.getAddress(),
      await share.getAddress(),
      await investmentManager.getAddress()
    );
    await pool.waitForDeployment();
    
    // Set up allowance on the underlying share token
    const approveAmount = ethers.parseEther("100");
    await share.connect(addr1).approve(addr2.getAddress(), approveAmount);
    
    // Call allowance on LiquidityPool - this should delegate to share.allowance
    const result = await pool.allowance(addr1.getAddress(), addr2.getAddress());
    
    // The original returns the actual allowance value
    // The mutant returns 0 (default) because it doesn't return the result
    expect(result).to.equal(approveAmount);
  });
});