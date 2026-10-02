import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant detection - deposit event emission", function () {
  it("should detect missing Deposit event emission in deposit function", async function () {
    const [owner, receiver] = await ethers.getSigners();
    
    // Deploy mock ERC20 asset token
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const assetToken = await ERC20Factory.deploy("Asset", "AST", 18);
    await assetToken.waitForDeployment();
    
    // Deploy mock TrancheToken
    const TrancheFactory = await ethers.getContractFactory("MockTrancheToken");
    const shareToken = await TrancheFactory.deploy("Share", "SHR", 18);
    await shareToken.waitForDeployment();
    
    // Deploy mock InvestmentManager
    const InvestmentManagerFactory = await ethers.getContractFactory("MockInvestmentManager");
    const investmentManager = await InvestmentManagerFactory.deploy();
    await investmentManager.waitForDeployment();
    
    // Deploy LiquidityPool with required constructor arguments
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("tranche1");
    const LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPool");
    const liquidityPool = await LiquidityPoolFactory.deploy(
      poolId,
      trancheId,
      await assetToken.getAddress(),
      await shareToken.getAddress(),
      await investmentManager.getAddress()
    );
    await liquidityPool.waitForDeployment();
    
    // Setup: Approve receiver and mint assets to owner
    const depositAssets = ethers.parseEther("100");
    await assetToken.mint(owner.address, depositAssets);
    await assetToken.connect(owner).approve(await investmentManager.getAddress(), depositAssets);
    
    // Configure investmentManager to return a fixed shares amount
    const expectedShares = ethers.parseEther("90");
    await investmentManager.setProcessDepositReturn(expectedShares);
    
    // Perform deposit and capture transaction receipt
    const tx = await liquidityPool.connect(owner).deposit(depositAssets, owner.address);
    const receipt = await tx.wait();
    
    // Check that Deposit event was emitted with correct parameters
    await expect(tx)
      .to.emit(liquidityPool, "Deposit")
      .withArgs(await liquidityPool.getAddress(), owner.address, depositAssets, expectedShares);
  });
});