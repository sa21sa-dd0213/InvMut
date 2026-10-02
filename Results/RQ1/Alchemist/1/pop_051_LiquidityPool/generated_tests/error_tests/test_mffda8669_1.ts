import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant mffda8669 - totalAssets return value", function () {
  it("should return the correct total assets value, not zero", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock ERC20 token for asset
    const AssetToken = await ethers.getContractFactory("ERC20Mock");
    const assetToken = await AssetToken.deploy("Asset", "AST", 18);
    await assetToken.waitForDeployment();
    
    // Deploy mock TrancheToken
    const TrancheToken = await ethers.getContractFactory("TrancheTokenMock");
    const trancheToken = await TrancheToken.deploy("Tranche", "TRN", 18);
    await trancheToken.waitForDeployment();
    
    // Deploy mock InvestmentManager
    const InvestmentManager = await ethers.getContractFactory("InvestmentManagerMock");
    const investmentManager = await InvestmentManager.deploy();
    await investmentManager.waitForDeployment();
    
    // Deploy LiquidityPool with constructor args: poolId, trancheId, asset, share, investmentManager
    const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("tranche1");
    const instance = await LiquidityPool.deploy(
      poolId,
      trancheId,
      await assetToken.getAddress(),
      await trancheToken.getAddress(),
      await investmentManager.getAddress()
    );
    await instance.waitForDeployment();
    
    // Mint some tokens to simulate assets in the pool
    const depositAmount = ethers.parseEther("100");
    await assetToken.mint(await instance.getAddress(), depositAmount);
    
    // Call totalAssets - original returns the value from investmentManager
    // The mutant will return 0 instead
    const totalAssets = await instance.totalAssets();
    
    // The totalAssets should be greater than zero since we deposited assets
    // This assertion will fail on the mutant which returns 0
    expect(totalAssets).to.be.gt(0);
    expect(totalAssets).to.equal(depositAmount);
  });
});