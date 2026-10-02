import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant m187d5bfe - maxDeposit return value", function () {
  it("should kill mutant by expecting non-zero maxDeposit return value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock ERC20 asset token
    const AssetTokenFactory = await ethers.getContractFactory("MockERC20");
    const assetToken = await AssetTokenFactory.deploy("Asset", "AST", 18);
    await assetToken.waitForDeployment();
    
    // Deploy mock TrancheToken
    const TrancheTokenFactory = await ethers.getContractFactory("MockTrancheToken");
    const trancheToken = await TrancheTokenFactory.deploy("Tranche", "TRN", 18);
    await trancheToken.waitForDeployment();
    
    // Deploy mock InvestmentManager
    const InvestmentManagerFactory = await ethers.getContractFactory("MockInvestmentManager");
    const investmentManager = await InvestmentManagerFactory.deploy();
    await investmentManager.waitForDeployment();
    
    // Set up mock to return non-zero maxDeposit
    await investmentManager.setMaxDeposit(addr1.address, ethers.parseEther("1000"));
    
    // Deploy LiquidityPool with constructor arguments
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("tranche1");
    const LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPool");
    const liquidityPool = await LiquidityPoolFactory.deploy(
      poolId,
      trancheId,
      await assetToken.getAddress(),
      await trancheToken.getAddress(),
      await investmentManager.getAddress()
    );
    await liquidityPool.waitForDeployment();
    
    // Call maxDeposit - should return non-zero in original, but zero in mutant
    const maxDepositAmount = await liquidityPool.maxDeposit(addr1.address);
    
    // The mutant removes the return statement, so it returns 0
    // The original returns the value from investmentManager (1000 tokens)
    expect(maxDepositAmount).to.equal(ethers.parseEther("1000"));
  });
});