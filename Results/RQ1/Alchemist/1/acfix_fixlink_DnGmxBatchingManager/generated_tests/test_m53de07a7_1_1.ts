import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager mutant m53de07a7 test", function () {
  it("should kill the mutant by verifying that user deposit from previous round is properly converted to shares when claiming", async function () {
    const [owner, keeper, vault, user] = await ethers.getSigners();
    
    // Deploy mock contracts needed for initialization
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    const usdc = await MockERC20.deploy("USDC", "USDC", 6);
    await sGlp.waitForDeployment();
    await usdc.waitForDeployment();
    
    // Deploy mock GMX contracts
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const glpManager = await MockGlpManager.deploy();
    await glpManager.waitForDeployment();
    
    const MockVault = await ethers.getContractFactory("MockVault");
    const gmxUnderlyingVault = await MockVault.deploy();
    await gmxUnderlyingVault.waitForDeployment();
    
    // Set vault address in glpManager
    await glpManager.setVault(gmxUnderlyingVault.target);
    
    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouter");
    const rewardRouter = await MockRewardRouter.deploy();
    await rewardRouter.waitForDeployment();
    
    const MockJuniorVault = await ethers.getContractFactory("MockDnGmxJuniorVault");
    const dnGmxJuniorVault = await MockJuniorVault.deploy();
    await dnGmxJuniorVault.waitForDeployment();
    
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
    
    // Grant allowances
    await instance.grantAllowances();
    
    // Set keeper
    await instance.setKeeper(keeper.address);
    
    // User deposits USDC in round 1
    const depositAmount = ethers.parseUnits("1000", 6); // 1000 USDC
    await usdc.mint(user.address, depositAmount);
    await usdc.connect(user).approve(instance.target, depositAmount);
    
    await instance.connect(user).depositUsdc(depositAmount, user.address);
    
    // Verify user deposit is recorded for round 1
    expect(await instance.currentRound()).to.equal(1);
    expect(await instance.usdcBalance(user.address)).to.equal(depositAmount);
    
    // Execute batch stake (advances to round 2 and pauses deposits)
    // Mock the GMX calls
    await gmxUnderlyingVault.setMinPrice(ethers.parseUnits("1", 6)); // $1 per USDC
    await rewardRouter.setMintAndStakeGlpReturn(depositAmount); // 1:1 conversion
    await dnGmxJuniorVault.setHarvestFeesSuccess(true);
    
    await instance.connect(keeper).executeBatchStake();
    
    // Verify we're now in round 2
    expect(await instance.currentRound()).to.equal(2);
    
    // Unpause for next operations
    await instance.connect(keeper).unpauseDeposit();
    
    // Execute batch deposit to create shares
    // Mock the junior vault deposit
    const totalShares = depositAmount; // 1:1 shares to USDC
    await dnGmxJuniorVault.setDepositReturn(totalShares);
    
    await instance.connect(keeper).executeBatchDeposit();
    
    // Now user tries to claim shares - should convert their round 1 deposit to shares
    const userUnclaimedShares = await instance.unclaimedShares(user.address);
    expect(userUnclaimedShares).to.be.gt(0); // Should have unclaimed shares from round 1
    
    // User claims their shares
    const claimAmount = userUnclaimedShares;
    
    // Mock the junior vault transfer
    await dnGmxJuniorVault.setTransferSuccess(true);
    
    await instance.connect(user).claim(user.address, claimAmount);
    
    // Verify shares were claimed (user's unclaimed shares should decrease)
    const remainingShares = await instance.unclaimedShares(user.address);
    expect(remainingShares).to.equal(0);
    
    // The mutant would fail here because userDepositRound (1) > currentRound (2) is false,
    // so the conversion from USDC to shares would never happen,
    // causing the claim to revert with InsufficientShares error
  });
});