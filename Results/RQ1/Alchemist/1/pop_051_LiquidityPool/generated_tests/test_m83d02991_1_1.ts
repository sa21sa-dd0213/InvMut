import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool mutant detection - decimals function", function () {
  it("should return the correct decimals value from the share token, not zero", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy a simple ERC20 token to use as the share token
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockShare = await MockERC20Factory.deploy("Test Share", "TSHARE", 18);
    await mockShare.waitForDeployment();

    // Deploy a mock InvestmentManager
    const MockInvestmentManagerFactory = await ethers.getContractFactory("MockInvestmentManager");
    const mockInvestmentManager = await MockInvestmentManagerFactory.deploy();
    await mockInvestmentManager.waitForDeployment();

    // Deploy the LiquidityPool with required constructor arguments
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("test-tranche");
    const asset = ethers.ZeroAddress; // Use zero address as placeholder for asset
    const LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPool");
    const liquidityPool = await LiquidityPoolFactory.deploy(
      poolId,
      trancheId,
      asset,
      await mockShare.getAddress(),
      await mockInvestmentManager.getAddress()
    );
    await liquidityPool.waitForDeployment();

    // Call decimals() and verify it returns 18 (the decimals of our mock share token)
    const decimals = await liquidityPool.decimals();
    expect(decimals).to.equal(18);
  });
});