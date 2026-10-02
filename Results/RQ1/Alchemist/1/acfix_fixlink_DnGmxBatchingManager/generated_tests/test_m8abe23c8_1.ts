import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager - Mutant m8abe23c8", function () {
  let instance: any;
  let owner: any;
  let keeper: any;
  let vault: any;
  let sGlp: any;
  let usdc: any;
  let rewardRouter: any;
  let glpManager: any;
  let gmxUnderlyingVault: any;

  beforeEach(async function () {
    const [ownerSigner, keeperSigner, vaultSigner] = await ethers.getSigners();
    owner = ownerSigner;
    keeper = keeperSigner;
    vault = vaultSigner;

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    usdc = await MockERC20.deploy("USDC", "USDC", 6);

    // Deploy mock reward router
    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouterV2");
    rewardRouter = await MockRewardRouter.deploy();

    // Deploy mock GLP manager
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    glpManager = await MockGlpManager.deploy();

    // Deploy mock GMX underlying vault
    const MockVault = await ethers.getContractFactory("MockVault");
    gmxUnderlyingVault = await MockVault.deploy();

    // Set vault address in glpManager
    await glpManager.setVault(gmxUnderlyingVault.target);

    // Deploy mock DnGmxJuniorVault
    const MockJuniorVault = await ethers.getContractFactory("MockDnGmxJuniorVault");
    const juniorVault = await MockJuniorVault.deploy();

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
    await instance.setKeeper(keeper.address);

    // Set slippage threshold to a reasonable value (e.g., 50 bps)
    await instance.setThresholds(50);

    // Grant allowances
    await instance.grantAllowances();
  });

  it("should fail on mutant because exponentiation causes overflow or incorrect minUsdg calculation", async function () {
    // Setup: Deposit USDC to create round balance
    const depositAmount = ethers.parseUnits("1000", 6); // 1000 USDC
    await usdc.mint(owner.address, depositAmount);
    await usdc.connect(owner).approve(instance.target, depositAmount);
    
    await instance.connect(owner).depositUsdc(depositAmount, owner.address);

    // Setup mock reward router to return a reasonable GLP amount
    const mockGlpAmount = ethers.parseUnits("100", 18);
    await rewardRouter.setMintAndStakeGlpReturn(mockGlpAmount);

    // Setup mock vault to return a price
    const mockPrice = ethers.parseUnits("1", 30); // 1 USD per USDC with 30 decimals
    await gmxUnderlyingVault.setMinPrice(mockPrice);

    // Attempt to execute batch stake
    // The mutant will cause 1e12 ** (10000 - 50) which overflows or produces astronomically large value
    // This should revert due to arithmetic overflow or failed staking
    await expect(
      instance.connect(keeper).executeBatchStake()
    ).to.be.reverted;
  });
});