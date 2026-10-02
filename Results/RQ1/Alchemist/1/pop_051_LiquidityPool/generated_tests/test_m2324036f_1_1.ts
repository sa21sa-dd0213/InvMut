import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant detection - withApproval modifier", function () {
  it("should revert when owner calls function with themselves as owner (mutant requires msg.sender != owner)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock ERC20 asset token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const assetToken = await MockERC20.deploy("Asset", "AST", 18);
    await assetToken.waitForDeployment();

    // Deploy mock TrancheToken
    const MockTrancheToken = await ethers.getContractFactory("MockTrancheToken");
    const shareToken = await MockTrancheToken.deploy("Tranche", "TRN", 18);
    await shareToken.waitForDeployment();

    // Deploy mock InvestmentManager
    const MockInvestmentManager = await ethers.getContractFactory("MockInvestmentManager");
    const investmentManager = await MockInvestmentManager.deploy();
    await investmentManager.waitForDeployment();

    // Deploy LiquidityPool
    const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    const pool = await LiquidityPool.deploy(
      1, // poolId
      ethers.encodeBytes32String("tranche1"), // trancheId
      await assetToken.getAddress(),
      await shareToken.getAddress(),
      await investmentManager.getAddress()
    );
    await pool.waitForDeployment();

    // Test: owner calls deposit with themselves as receiver
    // In original: msg.sender == owner passes
    // In mutant: msg.sender != owner fails, so it should revert
    await expect(
      pool.connect(owner).deposit(ethers.parseEther("100"), owner.address)
    ).to.be.revertedWith("LiquidityPool/no-approval");
  });
});