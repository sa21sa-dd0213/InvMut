import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager - unclaimedShares mutant detection", function () {
  it("should detect mutant where < is replaced with <= in unclaimedShares", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy mock contracts needed for DnGmxBatchingManager
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockRewardRouterV2 = await ethers.getContractFactory("MockRewardRouterV2");
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const MockVault = await ethers.getContractFactory("MockVault");
    const MockDnGmxJuniorVault = await ethers.getContractFactory("MockDnGmxJuniorVault");

    const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    const usdc = await MockERC20.deploy("USDC", "USDC", 6);
    const rewardRouter = await MockRewardRouterV2.deploy();
    const gmxUnderlyingVault = await MockVault.deploy();
    const glpManager = await MockGlpManager.deploy(gmxUnderlyingVault.address);
    const dnGmxJuniorVault = await MockDnGmxJuniorVault.deploy();

    // Deploy DnGmxBatchingManager
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize(
      sGlp.address,
      usdc.address,
      rewardRouter.address,
      glpManager.address,
      dnGmxJuniorVault.address,
      owner.address
    );

    // Grant allowances
    await instance.grantAllowances();

    // Setup: User deposits USDC in round 1
    const depositAmount = ethers.parseUnits("1000", 6); // 1000 USDC
    await usdc.mint(user.address, depositAmount);
    await usdc.connect(user).approve(instance.address, depositAmount);
    await instance.connect(user).depositUsdc(depositAmount, user.address);

    // Current round should be 1
    const currentRound = await instance.currentRound();
    expect(currentRound).to.equal(1);

    // User's deposit round should be 1 (same as current round)
    const userDeposit = await instance.userDeposits(user.address);
    expect(userDeposit.round).to.equal(1);

    // Call unclaimedShares BEFORE executeBatchDeposit is called
    // In the original contract: userDeposit.round (1) < vaultBatchingState.currentRound (1) is FALSE
    // So the conversion block is skipped, returning only userDeposit.unclaimedShares (0)
    // In the mutant: userDeposit.round (1) <= vaultBatchingState.currentRound (1) is TRUE
    // So the conversion block executes, incorrectly converting USDC balance to shares

    const unclaimedShares = await instance.unclaimedShares(user.address);

    // Expected: unclaimedShares should be 0 because no batch deposit has occurred yet
    // The mutant would incorrectly return a positive value, so this assertion kills it
    expect(unclaimedShares).to.equal(0);
  });
});