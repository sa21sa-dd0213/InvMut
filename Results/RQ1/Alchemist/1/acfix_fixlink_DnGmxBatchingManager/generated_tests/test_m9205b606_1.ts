import { expect } from "chai";
import { ethers } } from "hardhat";

describe("DnGmxBatchingManager - kill mutant m9205b606", function () {
  it("should kill mutant by testing _claim with previous round deposit where userUsdcBalance > 0", async function () {
    const [owner, keeper, vault, user] = await ethers.getSigners();
    
    // Deploy mock contracts for dependencies
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouter");
    const MockJuniorVault = await ethers.getContractFactory("MockJuniorVault");
    const MockVault = await ethers.getContractFactory("MockVault");
    
    const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    const usdc = await MockERC20.deploy("USDC", "USDC", 6);
    const glpManager = await MockGlpManager.deploy();
    const gmxUnderlyingVault = await MockVault.deploy();
    const rewardRouter = await MockRewardRouter.deploy();
    const dnGmxJuniorVault = await MockJuniorVault.deploy();
    
    await glpManager.setVault(gmxUnderlyingVault.target);
    await gmxUnderlyingVault.setMinPrice(ethers.parseUnits("1", 6)); // 1 USDC price
    
    // Deploy DnGmxBatchingManager
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize contract
    await instance.initialize(
      sGlp.target,
      usdc.target,
      rewardRouter.target,
      glpManager.target,
      dnGmxJuniorVault.target,
      keeper.address
    );
    
    // Set keeper
    await instance.setKeeper(keeper.address);
    
    // Setup: User deposits USDC in round 1
    const depositAmount = ethers.parseUnits("1000", 6); // 1000 USDC
    await usdc.mint(user.address, depositAmount);
    await usdc.connect(user).approve(instance.target, depositAmount);
    
    // Execute deposit in round 1
    await instance.connect(user).depositUsdc(depositAmount, user.address);
    
    // Keeper executes batch stake for round 1
    await instance.connect(keeper).executeBatchStake();
    
    // Setup mock for vault deposit return
    const totalShares = ethers.parseEther("1000");
    await dnGmxJuniorVault.setDepositReturn(totalShares);
    
    // Keeper executes batch deposit for round 1 (completing the round)
    await instance.connect(keeper).executeBatchDeposit();
    
    // Now round has advanced to round 2
    // User's deposit from round 1 should have userUsdcBalance > 0 and round < currentRound
    // This is the condition that the mutant breaks (userUsdcBalance < 0 instead of > 0)
    
    // User tries to claim shares - on original this should succeed converting USDC to shares
    // On mutant, the condition userUsdcBalance < 0 is always false for uint128
    // So user's unclaimedShares won't include the conversion from USDC balance
    // This will cause InsufficientShares revert or wrong amount
    
    const expectedShares = totalShares; // User gets all shares since they deposited all USDC
    await expect(
      instance.connect(user).claim(user.address, expectedShares)
    ).to.not.be.reverted; // Should succeed on original, fail on mutant
    
    // Additional verification - check unclaimedShares includes converted amount
    const unclaimed = await instance.unclaimedShares(user.address);
    expect(unclaimed).to.equal(expectedShares);
  });
});