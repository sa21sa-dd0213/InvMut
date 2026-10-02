import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant test - collectDeposit event emission", function () {
  it("should emit DepositCollected event when collectDeposit is called", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock ERC20 asset token
    const AssetToken = await ethers.getContractFactory("ERC20Mock");
    const assetToken = await AssetToken.deploy("Asset", "AST", 18);
    await assetToken.waitForDeployment();

    // Deploy mock TrancheTokenLike (share token)
    const ShareToken = await ethers.getContractFactory("TrancheTokenMock");
    const shareToken = await ShareToken.deploy("Share", "SHR", 18);
    await shareToken.waitForDeployment();

    // Deploy mock InvestmentManager
    const InvestmentManager = await ethers.getContractFactory("InvestmentManagerMock");
    const investmentManager = await InvestmentManager.deploy();
    await investmentManager.waitForDeployment();

    // Deploy LiquidityPool with required constructor args
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("tranche1");
    const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    const liquidityPool = await LiquidityPool.deploy(
      poolId,
      trancheId,
      await assetToken.getAddress(),
      await shareToken.getAddress(),
      await investmentManager.getAddress()
    );
    await liquidityPool.waitForDeployment();

    // Fund addr1 with assets and approve investmentManager
    const depositAmount = ethers.parseEther("100");
    await assetToken.mint(addr1.address, depositAmount);
    await assetToken.connect(addr1).approve(await investmentManager.getAddress(), depositAmount);

    // Setup: Make a deposit request first so collectDeposit can succeed
    await liquidityPool.connect(addr1).requestDeposit(depositAmount, addr1.address);

    // Mock the collectDeposit to return success
    await investmentManager.setCollectDepositSuccess(true);

    // Test: Call collectDeposit and check for event emission
    await expect(liquidityPool.connect(addr1).collectDeposit(addr1.address))
      .to.emit(liquidityPool, "DepositCollected")
      .withArgs(addr1.address);
  });
});