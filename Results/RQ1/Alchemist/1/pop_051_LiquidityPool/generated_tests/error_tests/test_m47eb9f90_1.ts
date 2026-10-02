import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant m47eb9f90 - balanceOf return removal", function () {
  it("should return the correct balance for an address, killing the mutant that removed the return statement", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock token for share (TrancheTokenLike)
    const MockToken = await ethers.getContractFactory("ERC20Mock");
    const share = await MockToken.deploy("TrancheToken", "TT", 18);
    await share.waitForDeployment();
    
    // Deploy mock for asset (IERC20)
    const asset = await MockToken.deploy("Asset", "AST", 18);
    await asset.waitForDeployment();
    
    // Deploy mock for InvestmentManager
    const MockInvestmentManager = await ethers.getContractFactory("MockInvestmentManager");
    const investmentManager = await MockInvestmentManager.deploy();
    await investmentManager.waitForDeployment();
    
    // Deploy LiquidityPool with required constructor arguments
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("tranche1");
    const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    const liquidityPool = await LiquidityPool.deploy(
      poolId,
      trancheId,
      await asset.getAddress(),
      await share.getAddress(),
      await investmentManager.getAddress()
    );
    await liquidityPool.waitForDeployment();
    
    // Mint some shares to addr1 to have a non-zero balance
    const mintAmount = ethers.parseEther("100");
    await share.mint(await addr1.getAddress(), mintAmount);
    
    // Call balanceOf and verify it returns the correct amount (not zero)
    const balance = await liquidityPool.balanceOf(await addr1.getAddress());
    expect(balance).to.equal(mintAmount);
  });
});