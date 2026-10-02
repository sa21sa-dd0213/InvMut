import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager - Mutant ma77671a4 test", function () {
  it("should detect mutant by checking unclaimedShares for a user with deposits from a completed round", async function () {
    const [owner, keeper, vault, user] = await ethers.getSigners();

    // Deploy mock contracts needed for DnGmxBatchingManager
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    await sGlp.waitForDeployment();
    const usdc = await MockERC20.deploy("USDC", "USDC", 18);
    await usdc.waitForDeployment();

    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const glpManager = await MockGlpManager.deploy();
    await glpManager.waitForDeployment();

    const MockVault = await ethers.getContractFactory("MockVault");
    const gmxUnderlyingVault = await MockVault.deploy();
    await gmxUnderlyingVault.waitForDeployment();
    await glpManager.setVault(gmxUnderlyingVault.target);

    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouterV2");
    const rewardRouter = await MockRewardRouter.deploy();
    await rewardRouter.waitForDeployment();

    const MockJuniorVault = await ethers.getContractFactory("MockDnGmxJuniorVault");
    const dnGmxJuniorVault = await MockJuniorVault.deploy();
    await dnGmxJuniorVault.waitForDeployment();

    // Deploy DnGmxBatchingManager
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

    // Give user some USDC
    const depositAmount = ethers.parseEther("100");
    await usdc.mint(user.address, depositAmount);
    await usdc.connect(user).approve(instance.target, depositAmount);

    // User deposits USDC in round 1
    await instance.connect(user).depositUsdc(depositAmount, user.address);

    // Set up keeper to execute batch stake and batch deposit to advance rounds
    const usdcPrice = ethers.parseEther("1");
    await gmxUnderlyingVault.setMinPrice(usdc.target, usdcPrice);

    // Execute batch stake (simulates staking and creates shares)
    await instance.connect(keeper).executeBatchStake();

    // Mock the junior vault deposit to return shares
    const mockShares = ethers.parseEther("90");
    await dnGmxJuniorVault.setDepositReturn(mockShares);

    // Execute batch deposit to advance to round 2
    await instance.connect(keeper).executeBatchDeposit();

    // Now user should have unclaimed shares from round 1
    const unclaimedShares = await instance.unclaimedShares(user.address);

    // Original contract would return > 0 shares from the completed round
    // Mutant with > operator would return 0 because round 1 is NOT > currentRound (2)
    expect(unclaimedShares).to.be.gt(0);
  });
});