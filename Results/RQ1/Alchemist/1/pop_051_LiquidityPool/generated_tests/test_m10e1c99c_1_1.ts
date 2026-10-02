import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant test - m10e1c99c", function () {
  it("should revert when mint is called by an address different from receiver (missing withApproval modifier)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock ERC20 asset token
    const AssetTokenFactory = await ethers.getContractFactory("MockERC20");
    const assetToken = await AssetTokenFactory.deploy("Asset", "AST", 18);
    await assetToken.waitForDeployment();
    
    // Deploy mock TrancheToken (share)
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
    
    // addr1 (not the receiver) tries to call mint for addr2 - should revert with modifier check
    await expect(
      liquidityPool.connect(addr1).mint(
        ethers.parseEther("100"),
        addr2.address
      )
    ).to.be.revertedWith("LiquidityPool/no-approval");
  });
});