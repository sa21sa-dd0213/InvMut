import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant m4b290105 - requestDeposit event emission", function () {
  it("should emit DepositRequested event when requestDeposit is called", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock ERC20 asset token (simplified version for testing)
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const assetToken = await MockERC20Factory.deploy("Asset", "AST", 18);
    await assetToken.waitForDeployment();
    
    // Deploy mock TrancheToken
    const MockTrancheTokenFactory = await ethers.getContractFactory("MockTrancheToken");
    const shareToken = await MockTrancheTokenFactory.deploy("Tranche", "TRN", 18);
    await shareToken.waitForDeployment();
    
    // Deploy mock InvestmentManager
    const MockInvestmentManagerFactory = await ethers.getContractFactory("MockInvestmentManager");
    const investmentManager = await MockInvestmentManagerFactory.deploy();
    await investmentManager.waitForDeployment();
    
    // Deploy LiquidityPool with constructor arguments
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("test-tranche");
    const LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPool");
    const liquidityPool = await LiquidityPoolFactory.deploy(
      poolId,
      trancheId,
      await assetToken.getAddress(),
      await shareToken.getAddress(),
      await investmentManager.getAddress()
    );
    await liquidityPool.waitForDeployment();
    
    // Prepare test parameters
    const depositAssets = ethers.parseEther("100");
    const owner = addr1.address;
    
    // Call requestDeposit and check for event emission
    const tx = await liquidityPool.connect(addr1).requestDeposit(depositAssets, owner);
    const receipt = await tx.wait();
    
    // Verify DepositRequested event was emitted with correct parameters
    await expect(tx)
      .to.emit(liquidityPool, "DepositRequested")
      .withArgs(owner, depositAssets);
  });
});