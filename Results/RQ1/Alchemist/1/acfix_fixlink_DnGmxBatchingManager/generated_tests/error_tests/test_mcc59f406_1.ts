import { expect } from "chai";
import { ethers } } from "hardhat";

describe("DnGmxBatchingManager - Kill mutant mcc59f406", function () {
  let owner: any, keeper: any, vault: any;
  let instance: any;
  let usdc: any;
  let sGlp: any;
  let rewardRouter: any;
  let glpManager: any;
  let gmxUnderlyingVault: any;

  beforeEach(async function () {
    [owner, keeper, vault] = await ethers.getSigners();

    // Deploy mock contracts for the dependencies
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouter");
    const MockVault = await ethers.getContractFactory("MockVault");
    const MockJuniorVault = await ethers.getContractFactory("MockJuniorVault");

    usdc = await MockERC20.deploy("USDC", "USDC", 6);
    await usdc.waitForDeployment();

    sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    await sGlp.waitForDeployment();

    gmxUnderlyingVault = await MockVault.deploy();
    await gmxUnderlyingVault.waitForDeployment();

    glpManager = await MockGlpManager.deploy(gmxUnderlyingVault.target);
    await glpManager.waitForDeployment();

    rewardRouter = await MockRewardRouter.deploy();
    await rewardRouter.waitForDeployment();

    const juniorVault = await MockJuniorVault.deploy();
    await juniorVault.waitForDeployment();

    // Deploy the DnGmxBatchingManager
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

    // Set keeper
    await instance.connect(owner).setKeeper(keeper.address);

    // Set slippage threshold to 50 bps (0.5%)
    await instance.connect(owner).setThresholds(50);

    // Grant allowances
    await instance.connect(owner).grantAllowances();
  });

  it("should revert when slippage exceeds threshold due to market conditions", async function () {
    // Setup: mint USDC to vault and approve
    const depositAmount = ethers.parseUnits("1000", 6);
    await usdc.mint(vault.address, depositAmount);
    await usdc.connect(vault).approve(instance.target, depositAmount);

    // Deposit USDC via vault
    await instance.connect(vault).depositUsdc(depositAmount, vault.address);

    // Setup mock to simulate market slippage of 0.6% (above the 0.5% threshold)
    // Mock the getMinPrice to return a price that would cause insufficient output
    const mockPrice = ethers.parseUnits("1", 18); // 1 USD per USDC
    await gmxUnderlyingVault.setMinPrice(mockPrice);

    // Mock rewardRouter.mintAndStakeGlp to return less GLP than expected (simulating 0.6% slippage)
    const expectedGlp = depositAmount;
    const actualGlpWithSlippage = expectedGlp * BigInt(9940) / BigInt(10000); // 0.6% less
    await rewardRouter.setMintAndStakeGlpReturn(actualGlpWithSlippage);

    // Execute batch stake - should revert due to slippage protection
    await expect(
      instance.connect(keeper).executeBatchStake()
    ).to.be.reverted;

    // The mutant would allow this transaction to succeed because its faulty calculation
    // (using division instead of subtraction) would compute a much lower minUsdg,
    // failing to protect against the 0.6% slippage
  });
});