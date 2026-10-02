import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant kill test - totalSupply", function () {
  it("should kill mutant m98bebac0 by verifying totalSupply returns non-zero after minting shares", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock ERC20 asset token
    const AssetTokenFactory = await ethers.getContractFactory("MockERC20");
    const assetToken = await AssetTokenFactory.deploy("Asset", "AST", 18);
    await assetToken.waitForDeployment();

    // Deploy mock TrancheToken (share token)
    const TrancheTokenFactory = await ethers.getContractFactory("MockTrancheToken");
    const shareToken = await TrancheTokenFactory.deploy("Tranche", "TRN", 18);
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

    // Mint some shares to the liquidity pool via auth (owner is authed)
    const mintAmount = ethers.parseEther("100");
    await shareToken.mint(await liquidityPool.getAddress(), mintAmount);

    // Call totalSupply and verify it returns the non-zero amount
    const totalSupply = await liquidityPool.totalSupply();
    expect(totalSupply).to.equal(mintAmount);
  });
});