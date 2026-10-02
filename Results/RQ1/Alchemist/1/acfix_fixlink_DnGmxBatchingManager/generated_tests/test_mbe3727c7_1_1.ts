import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager mutant mbe3727c7 test", function () {
  it("should detect mutant by verifying correct handling of zero usdcBalance in depositUsdc", async function () {
    const [owner, vault, keeper, user] = await ethers.getSigners();

    // Deploy mock contracts for dependencies
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouterV2");
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const MockJuniorVault = await ethers.getContractFactory("MockDnGmxJuniorVault");

    const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    const usdc = await MockERC20.deploy("USDC", "USDC", 6);
    const rewardRouter = await MockRewardRouter.deploy();
    const glpManager = await MockGlpManager.deploy();
    const juniorVault = await MockJuniorVault.deploy();

    // Deploy the contract
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize
    await instance.initialize(
      sGlp.target,
      usdc.target,
      rewardRouter.target,
      glpManager.target,
      juniorVault.target,
      keeper.address
    );

    // Setup: Set keeper and unpause
    await instance.connect(owner).setKeeper(keeper.address);
    await instance.connect(keeper).unpauseDeposit();

    // Setup: User deposits USDC in round 1
    const depositAmount = ethers.parseUnits("1000", 6);
    await usdc.connect(user).approve(instance.target, depositAmount);
    await usdc.connect(vault).approve(instance.target, depositAmount);

    // First deposit by user
    await instance.connect(user).depositUsdc(depositAmount, user.address);

    // Execute batch stake and deposit to move to round 2
    await instance.connect(keeper).executeBatchStake();
    await instance.connect(keeper).executeBatchDeposit();

    // User claims all shares from round 1
    const unclaimedShares = await instance.unclaimedShares(user.address);
    if (unclaimedShares > 0n) {
      await instance.connect(user).claim(user.address, unclaimedShares);
    }

    // At this point, user's usdcBalance should be 0 and round < currentRound (round 1 < round 2)
    const userDeposit = await instance.userDeposits(user.address);
    expect(userDeposit.usdcBalance).to.equal(0);
    expect(userDeposit.round).to.be.lessThan(await instance.currentRound());

    // Record unclaimedShares before second deposit
    const unclaimedBefore = await instance.unclaimedShares(user.address);

    // User makes a new deposit in round 2
    const newDepositAmount = ethers.parseUnits("500", 6);
    await usdc.connect(user).approve(instance.target, newDepositAmount);
    await instance.connect(user).depositUsdc(newDepositAmount, user.address);

    // In the original contract, unclaimedShares should remain unchanged
    // In the mutant (>= 0), the if-block is entered even with 0 balance,
    // causing incorrect conversion math that would modify unclaimedShares
    const unclaimedAfter = await instance.unclaimedShares(user.address);

    // The mutant would incorrectly modify unclaimedShares when usdcBalance is 0
    // The original contract keeps unclaimedShares the same
    expect(unclaimedAfter).to.equal(unclaimedBefore);

    // Verify user deposit state is correct
    const updatedDeposit = await instance.userDeposits(user.address);
    expect(updatedDeposit.round).to.equal(await instance.currentRound());
    expect(updatedDeposit.usdcBalance).to.equal(newDepositAmount);
  });
});