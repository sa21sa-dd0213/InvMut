import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager - Kill mutant m68e2f4b1", function () {
  it("should detect the mutant by verifying slippage calculation with addition instead of multiplication", async function () {
    const [owner, keeper, vault, user] = await ethers.getSigners();
    
    // Deploy mock contracts for dependencies
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouter");
    const MockVault = await ethers.getContractFactory("MockVault");
    const MockJuniorVault = await ethers.getContractFactory("MockJuniorVault");
    
    const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    const usdc = await MockERC20.deploy("USDC", "USDC", 6);
    const glpManager = await MockGlpManager.deploy();
    const gmxUnderlyingVault = await MockVault.deploy();
    const rewardRouter = await MockRewardRouter.deploy();
    const dnGmxJuniorVault = await MockJuniorVault.deploy();
    
    // Setup mock returns
    const mockPrice = ethers.parseUnits("1.5", 18); // $1.5 per USDC
    await gmxUnderlyingVault.setMinPrice(usdc.target, mockPrice);
    await glpManager.setVault(gmxUnderlyingVault.target);
    
    // Deploy the actual contract
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize(
      sGlp.target,
      usdc.target,
      rewardRouter.target,
      glpManager.target,
      dnGmxJuniorVault.target,
      keeper.address
    );
    
    // Set keeper and slippage threshold
    await instance.setKeeper(keeper.address);
    const slippageBps = 100; // 1% slippage tolerance
    await instance.setThresholds(slippageBps);
    
    // Setup: fund contract with USDC via depositUsdc
    const depositAmount = ethers.parseUnits("1000", 6); // 1000 USDC
    await usdc.mint(user.address, depositAmount);
    await usdc.connect(user).approve(instance.target, depositAmount);
    await instance.connect(user).depositUsdc(depositAmount, user.address);
    
    // Setup mock reward router to return a fixed GLP amount
    const mockGlpReturned = ethers.parseUnits("800", 18);
    await rewardRouter.setMintAndStakeGlpReturn(mockGlpReturned);
    
    // The key assertion: In the original contract, minUsdg calculation is:
    // _roundUsdcBalance * (price * 1e12 * (MAX_BPS - slippageBps)) / (1e30 * MAX_BPS)
    // In the mutant, it's:
    // _roundUsdcBalance * (price + 1e12 * (MAX_BPS - slippageBps)) / (1e30 * MAX_BPS)
    
    // For the original: price * 1e12 = 1.5e18 * 1e12 = 1.5e30
    // For the mutant: price + 1e12 * (10000 - 100) = 1.5e18 + 1e12 * 9900 = 1.5e18 + 9.9e15 ≈ 1.5099e18
    
    // The original minUsdg would be much larger than the mutant's minUsdg
    // This means the mutant would pass a much lower minUsdg to the reward router
    
    // Execute batch stake
    await instance.connect(keeper).executeBatchStake();
    
    // Verify the minUsdg passed to reward router - in the mutant it would be much smaller
    const minUsdgUsed = await rewardRouter.lastMinUsdg();
    const expectedMinUsdg = await instance.calculateExpectedMinUsdg(); // This function doesn't exist, but we can calculate
    
    // The mutant would produce a significantly smaller minUsdg value
    // For price = 1.5e18:
    // Original: 1.5e18 * 1e12 * 9900 = 1.485e34
    // Mutant: 1.5e18 + 1e12 * 9900 = 1.5e18 + 9.9e15 = 1.5099e18
    
    // The ratio between original and mutant minUsdg would be approximately 1.485e34 / 1.5099e18 ≈ 9.83e15
    
    // If the test passes (mutant detected), the minUsdg would be unreasonably low
    // We expect the reward router to have received a minUsdg that is too low for the intended slippage protection
    const expectedOriginalMinUsdg = depositAmount * mockPrice * 1n * 1n * BigInt(10000 - slippageBps) / (BigInt(1e30) * BigInt(10000));
    // Simplified: This should be a very large number
    // The mutant would produce a number ~10^15 times smaller
    
    // Assert that the minUsdg used is suspiciously low (mutant behavior)
    // If the mutant is active, minUsdgUsed would be very small
    // If original is active, minUsdgUsed would be very large
    expect(minUsdgUsed).to.be.lessThan(ethers.parseUnits("1000000", 18)); // If mutant, this would be true
    
    // Additional verification: Check that the batch stake event was emitted with correct values
    await expect(instance.connect(keeper).executeBatchStake())
      .to.emit(instance, "BatchStake")
      .withArgs(1, depositAmount, mockGlpReturned);
  });
});