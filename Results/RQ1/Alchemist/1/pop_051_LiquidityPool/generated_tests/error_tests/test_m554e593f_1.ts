import { expect } from "chai";
import { ethers } } from "hardhat";

describe("LiquidityPool mutant test - maxWithdraw", function () {
  it("should return correct maxWithdraw amount, not zero", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock ERC20 asset token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const asset = await MockERC20.deploy("Asset", "AST", 18);
    await asset.waitForDeployment();
    
    // Deploy mock TrancheToken
    const MockTrancheToken = await ethers.getContractFactory("MockTrancheToken");
    const share = await MockTrancheToken.deploy("Tranche", "TRC", 18);
    await share.waitForDeployment();
    
    // Deploy mock InvestmentManager
    const MockInvestmentManager = await ethers.getContractFactory("MockInvestmentManager");
    const investmentManager = await MockInvestmentManager.deploy();
    await investmentManager.waitForDeployment();
    
    // Deploy LiquidityPool
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("tranche1");
    const LiquidityPool = await ethers.getContractFactory("LiquidityPool");
    const pool = await LiquidityPool.deploy(
      poolId,
      trancheId,
      await asset.getAddress(),
      await share.getAddress(),
      await investmentManager.getAddress()
    );
    await pool.waitForDeployment();
    
    // Set up mock: make maxWithdraw return a positive value for addr1
    const maxWithdrawAmount = ethers.parseEther("100");
    await investmentManager.setMaxWithdraw(await addr1.getAddress(), await pool.getAddress(), maxWithdrawAmount);
    
    // Call maxWithdraw and verify it returns the expected positive value
    const result = await pool.maxWithdraw(await addr1.getAddress());
    
    // The mutant would return 0, so this assertion kills the mutant
    expect(result).to.equal(maxWithdrawAmount);
    expect(result).to.be.gt(0);
  });
});