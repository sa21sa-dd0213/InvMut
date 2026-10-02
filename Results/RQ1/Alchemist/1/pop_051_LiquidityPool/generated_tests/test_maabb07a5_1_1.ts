import { expect } from "chai";
import { ethers } from "hardhat";

describe("LiquidityPool - mutant maabb07a5 (name() return removed)", function () {
  it("should return the correct token name from share.name()", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy a mock share token that implements name()
    const MockShareFactory = await ethers.getContractFactory("MockShareToken");
    const mockShare = await MockShareFactory.deploy("Test Share", "TSHARE");
    await mockShare.waitForDeployment();

    // Deploy a mock investment manager (needed for constructor)
    const MockInvestmentManagerFactory = await ethers.getContractFactory("MockInvestmentManager");
    const mockInvestmentManager = await MockInvestmentManagerFactory.deploy();
    await mockInvestmentManager.waitForDeployment();

    // Deploy LiquidityPool with required constructor args
    const LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPool");
    const poolId = 1;
    const trancheId = ethers.encodeBytes32String("tranche1").substring(0, 34) as `0x${string}`;
    const asset = ethers.ZeroAddress; // placeholder asset address
    const share = await mockShare.getAddress();
    const investmentManager = await mockInvestmentManager.getAddress();

    const liquidityPool = await LiquidityPoolFactory.deploy(
      poolId,
      trancheId,
      asset,
      share,
      investmentManager
    );
    await liquidityPool.waitForDeployment();

    // Call name() and verify it returns the expected token name
    const name = await liquidityPool.name();
    expect(name).to.equal("Test Share");
  });
});