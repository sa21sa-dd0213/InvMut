import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant m71ca48c3 - Deposit event in mint function", function () {
  it("should emit Deposit event when mint is called with valid parameters", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock ERC20 asset token
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const assetToken = await ERC20Factory.deploy("Asset", "AST", 18);
    await assetToken.waitForDeployment();
    
    // Deploy mock TrancheToken
    const TrancheTokenFactory = await ethers.getContractFactory("TrancheTokenMock");
    const shareToken = await TrancheTokenFactory.deploy("Share", "SHR", 18);
    await shareToken.waitForDeployment();
    
    // Deploy mock InvestmentManager
    const InvestmentManagerFactory = await ethers.getContractFactory("InvestmentManagerMock");
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
    
    // Set up the mock to return expected values
    const mintAssets = ethers.parseEther("100");
    const mintShares = ethers.parseEther("1000");
    
    // Configure mock investmentManager to return a value for processMint
    await investmentManager.setProcessMintReturn(mintAssets);
    
    // Grant approval to addr1 (receiver) to call mint
    await liquidityPool.connect(owner).rely(addr1.address);
    
    // Call mint and check for Deposit event
    await expect(liquidityPool.connect(addr1).mint(mintShares, addr1.address))
      .to.emit(liquidityPool, "Deposit")
      .withArgs(liquidityPool.target, addr1.address, mintAssets, mintShares);
  });
});