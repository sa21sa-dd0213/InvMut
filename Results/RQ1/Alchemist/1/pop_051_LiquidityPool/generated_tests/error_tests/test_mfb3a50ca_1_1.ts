import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant mfb3a50ca - requestRedeemWithPermit event emission", function () {
  it("should emit RedeemRequested event when requestRedeemWithPermit is called", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock ERC20 token for asset
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const assetToken = await MockERC20Factory.deploy("Asset", "AST", 18);
    await assetToken.waitForDeployment();

    // Deploy mock TrancheToken (share) with permit functionality
    const MockTrancheTokenFactory = await ethers.getContractFactory("MockTrancheToken");
    const shareToken = await MockTrancheTokenFactory.deploy("Share", "SHR", 18);
    await shareToken.waitForDeployment();

    // Deploy mock InvestmentManager
    const MockInvestmentManagerFactory = await ethers.getContractFactory("MockInvestmentManager");
    const investmentManager = await MockInvestmentManagerFactory.deploy();
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

    // Set up: authorize owner for the pool
    await liquidityPool.rely(owner.address);

    // Prepare permit parameters (using mock signature values)
    const deadline = ethers.MaxUint256;
    const v = 27;
    const r = ethers.randomBytes(32);
    const s = ethers.randomBytes(32);

    // Call requestRedeemWithPermit and check for RedeemRequested event
    const shares = ethers.parseEther("100");
    await expect(
      liquidityPool.connect(owner).requestRedeemWithPermit(shares, owner.address, deadline, v, r, s)
    )
      .to.emit(liquidityPool, "RedeemRequested")
      .withArgs(owner.address, shares);
  });
});