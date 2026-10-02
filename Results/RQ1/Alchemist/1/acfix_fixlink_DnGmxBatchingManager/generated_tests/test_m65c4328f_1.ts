import { expect } from "chai";
import { ethers } } from "hardhat";

describe("DnGmxBatchingManager - kill mutant m65c4328f", function () {
  it("should revert on executeBatchStake when minUsdg calculation is incorrect due to operator mutation", async function () {
    const [owner, keeper, vault, user] = await ethers.getSigners();
    
    // Deploy mock contracts needed for initialization
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockRewardRouterV2 = await ethers.getContractFactory("MockRewardRouterV2");
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const MockJuniorVault = await ethers.getContractFactory("MockDnGmxJuniorVault");
    
    const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    const usdc = await MockERC20.deploy("USDC", "USDC", 6);
    const rewardRouter = await MockRewardRouterV2.deploy();
    const glpManager = await MockGlpManager.deploy();
    const juniorVault = await MockJuniorVault.deploy();
    
    await sGlp.waitForDeployment();
    await usdc.waitForDeployment();
    await rewardRouter.waitForDeployment();
    await glpManager.waitForDeployment();
    await juniorVault.waitForDeployment();
    
    // Deploy the DnGmxBatchingManager contract
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize(
      await sGlp.getAddress(),
      await usdc.getAddress(),
      await rewardRouter.getAddress(),
      await glpManager.getAddress(),
      await juniorVault.getAddress(),
      await keeper.getAddress()
    );
    
    // Setup: set keeper and thresholds
    await instance.setKeeper(await keeper.getAddress());
    await instance.setThresholds(100); // 1% slippage threshold
    
    // Setup: fund user with USDC and approve
    const depositAmount = ethers.parseUnits("1000", 6); // 1000 USDC
    await usdc.mint(await user.getAddress(), depositAmount);
    await usdc.connect(user).approve(await instance.getAddress(), depositAmount);
    
    // User deposits USDC
    await instance.connect(user).depositUsdc(depositAmount, await user.getAddress());
    
    // Verify roundUsdcBalance is set
    expect(await instance.roundUsdcBalance()).to.equal(depositAmount);
    
    // Setup: mock the vault price to ensure the calculation matters
    const mockVault = await ethers.getContractAt("IVault", await glpManager.vault());
    // The price returned will affect the minUsdg calculation
    
    // Attempt to execute batch stake - should fail on mutant due to incorrect minUsdg
    // The original calculates: minUsdg = amount * (price * 1e12 * (MAX_BPS - slippage)) / (1e30 * MAX_BPS)
    // The mutant calculates: minUsdg = amount * (price * 1e12 * (MAX_BPS - slippage)) / (1e30 + MAX_BPS)
    // The mutant denominator is much smaller (~1e30 vs 1e34), making minUsdg ~10000x larger
    // This causes the GLP mint to revert due to excessive slippage requirement
    
    // The test expects revert because the mutant's calculation produces unreasonably high minUsdg
    await expect(
      instance.connect(keeper).executeBatchStake()
    ).to.be.reverted;
    
    // Additional check: verify the round state was not updated (failed transaction)
    expect(await instance.roundGlpStaked()).to.equal(0);
    expect(await instance.currentRound()).to.equal(1);
  });
});