import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant mc0ea3b07 test", function () {
  it("should kill the mutant by testing _successCheck revert on successful call", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock ERC20 for asset
    const AssetFactory = await ethers.getContractFactory("MockERC20");
    const asset = await AssetFactory.deploy("Asset", "AST", 18);
    await asset.waitForDeployment();
    
    // Deploy mock TrancheToken (share)
    const ShareFactory = await ethers.getContractFactory("MockTrancheToken");
    const share = await ShareFactory.deploy("Tranche", "TRN", 18);
    await share.waitForDeployment();
    
    // Deploy mock InvestmentManager
    const InvestmentManagerFactory = await ethers.getContractFactory("MockInvestmentManager");
    const investmentManager = await InvestmentManagerFactory.deploy();
    await investmentManager.waitForDeployment();
    
    // Deploy LiquidityPool
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("tranche1");
    const LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPool");
    const pool = await LiquidityPoolFactory.deploy(
      poolId,
      trancheId,
      await asset.getAddress(),
      await share.getAddress(),
      await investmentManager.getAddress()
    );
    await pool.waitForDeployment();
    
    // Mint some shares to addr1 to enable transfer
    await share.mint(addr1.address, ethers.parseEther("100"));
    await share.connect(addr1).approve(await pool.getAddress(), ethers.parseEther("100"));
    
    // Test: transfer function should revert on mutant but pass on original
    // The mutant makes _successCheck always revert, so a legitimate transfer will fail
    await expect(
      pool.connect(addr1).transfer(owner.address, ethers.parseEther("10"))
    ).to.be.reverted;
    
    // Additional verification: the original would succeed, so the revert indicates the mutant
    // Test approve function similarly
    await expect(
      pool.connect(addr1).approve(owner.address, ethers.parseEther("10"))
    ).to.be.reverted;
  });
});