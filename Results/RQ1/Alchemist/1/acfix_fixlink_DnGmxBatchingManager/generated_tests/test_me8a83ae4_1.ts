import { expect } from "chai";
import { ethers } } from "hardhat";

describe("DnGmxBatchingManager - Mutant me8a83ae4", function () {
  let owner: any;
  let keeper: any;
  let vault: any;
  let instance: any;
  let sGlp: any;
  let usdc: any;
  let rewardRouter: any;
  let glpManager: any;
  let gmxUnderlyingVault: any;

  beforeEach(async function () {
    [owner, keeper, vault] = await ethers.getSigners();

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    await sGlp.waitForDeployment();
    
    usdc = await MockERC20.deploy("USDC", "USDC", 6);
    await usdc.waitForDeployment();

    // Deploy mock GMX contracts
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    glpManager = await MockGlpManager.deploy();
    await glpManager.waitForDeployment();

    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouterV2");
    rewardRouter = await MockRewardRouter.deploy();
    await rewardRouter.waitForDeployment();

    const MockVault = await ethers.getContractFactory("MockVault");
    gmxUnderlyingVault = await MockVault.deploy();
    await gmxUnderlyingVault.waitForDeployment();

    // Set vault address in glpManager
    await glpManager.setVault(gmxUnderlyingVault.target);

    // Deploy mock DnGmxJuniorVault
    const MockJuniorVault = await ethers.getContractFactory("MockDnGmxJuniorVault");
    const juniorVault = await MockJuniorVault.deploy();
    await juniorVault.waitForDeployment();

    // Deploy DnGmxBatchingManager
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize(
      sGlp.target,
      usdc.target,
      rewardRouter.target,
      glpManager.target,
      juniorVault.target,
      keeper.address
    );

    // Set slippage threshold to a non-zero value (e.g., 100 bps)
    await instance.connect(owner).setThresholds(100);

    // Grant allowances
    await instance.connect(owner).grantAllowances();

    // Setup mock: make rewardRouter.mintAndStakeGlp succeed for valid minUsdg
    await rewardRouter.setShouldSucceed(true);
    
    // Set min price in vault to a known value (1 USDC = 1 USD)
    await gmxUnderlyingVault.setMinPrice(ethers.parseUnits("1", 6));
  });

  it("should revert when executing batch stake with slippage threshold added instead of subtracted", async function () {
    // First deposit some USDC to have balance in the vault batching state
    const depositAmount = ethers.parseUnits("1000", 6); // 1000 USDC
    
    // Mint USDC to vault and approve
    await usdc.mint(vault.address, depositAmount);
    await usdc.connect(vault).approve(instance.target, depositAmount);
    
    // Call depositUsdc from vault address (simulating junior vault calling)
    await instance.connect(vault).depositUsdc(depositAmount, vault.address);

    // Now try to execute batch stake - this should revert with the mutant
    // because the minUsdg calculation uses MAX_BPS + slippageThresholdGmxBps
    // resulting in a minUsdg higher than the actual price
    await expect(
      instance.connect(keeper).executeBatchStake()
    ).to.be.reverted;
  });
});