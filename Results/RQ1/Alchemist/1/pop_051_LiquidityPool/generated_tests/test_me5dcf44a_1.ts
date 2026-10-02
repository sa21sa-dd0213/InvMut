import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant kill test - me5dcf44a", function () {
  it("should emit RedeemCollected event when collectRedeem is called", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock ERC20 asset token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const assetToken = await MockERC20.deploy("Asset", "AST", 18);
    await assetToken.waitForDeployment();
    
    // Deploy mock TrancheToken
    const MockTrancheToken = await ethers.getContractFactory("MockTrancheToken");
    const shareToken = await MockTrancheToken.deploy("Share", "SHR", 18);
    await shareToken.waitForDeployment();
    
    // Deploy mock InvestmentManager
    const MockInvestmentManager = await ethers.getContractFactory("MockInvestmentManager");
    const investmentManager = await MockInvestmentManager.deploy();
    await investmentManager.waitForDeployment();
    
    // Deploy LiquidityPool with constructor arguments
    const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("tranche1");
    const instance = await LiquidityPool.deploy(
      poolId,
      trancheId,
      await assetToken.getAddress(),
      await shareToken.getAddress(),
      await investmentManager.getAddress()
    );
    await instance.waitForDeployment();
    
    // Call collectRedeem and expect RedeemCollected event to be emitted
    await expect(instance.connect(addr1).collectRedeem(addr1.address))
      .to.emit(instance, "RedeemCollected")
      .withArgs(addr1.address);
  });
});