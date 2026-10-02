import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager - Kill mutant m88f9ddcd (|| instead of &&)", function () {
  it("should detect the mutant by verifying unclaimedShares calculation when user has old round deposit with zero usdcBalance", async function () {
    const [owner, user, vault, keeper] = await ethers.getSigners();

    // Deploy mock contracts for dependencies
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouter");
    const MockVault = await ethers.getContractFactory("MockVault");
    const MockJuniorVault = await ethers.getContractFactory("MockJuniorVault");

    const usdc = await MockERC20.deploy("USDC", "USDC", 6);
    const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    const glpManager = await MockGlpManager.deploy();
    const rewardRouter = await MockRewardRouter.deploy();
    const gmxUnderlyingVault = await MockVault.deploy();
    const dnGmxJuniorVault = await MockJuniorVault.deploy();

    await glpManager.setVault(gmxUnderlyingVault.target);

    // Deploy the main contract
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize
    await instance.initialize(
      sGlp.target,
      usdc.target,
      rewardRouter.target,
      glpManager.target,
      dnGmxJuniorVault.target,
      keeper.address
    );

    // Setup: User makes a deposit in round 1
    await usdc.mint(user.address, ethers.parseUnits("1000", 6));
    await usdc.connect(user).approve(instance.target, ethers.parseUnits("1000", 6));

    // Set currentRound to 1 and make deposit
    await instance.connect(user).depositUsdc(ethers.parseUnits("500", 6), user.address);

    // Execute batch stake and deposit to process round 1
    await gmxUnderlyingVault.setMinPrice(ethers.parseUnits("1", 18));
    await dnGmxJuniorVault.setDepositReturn(ethers.parseUnits("100", 18));
    await instance.connect(keeper).executeBatchStake();
    await instance.connect(keeper).executeBatchDeposit();

    // Now user has a deposit from round 1 that has been processed
    // Their usdcBalance was set to 0 during the batch deposit process
    // Verify initial state: user has old round with zero usdcBalance
    const userDepositBefore = await instance.userDeposits(user.address);
    expect(userDepositBefore.round).to.be.lessThan(await instance.currentRound());
    expect(userDepositBefore.usdcBalance).to.equal(0);

    // The key test: unclaimedShares should NOT add extra shares because usdcBalance is 0
    // In the original: condition is (oldRound && usdcBalance > 0) -> false, so no extra shares
    // In the mutant: condition is (oldRound || usdcBalance > 0) -> true, so extra shares added incorrectly

    const unclaimedShares = await instance.unclaimedShares(user.address);
    const userDepositAfter = await instance.userDeposits(user.address);

    // If mutant is alive (original logic), unclaimedShares should equal userDeposit.unclaimedShares
    // because no extra shares are added when usdcBalance is 0
    // If mutant is killed (mutated logic), unclaimedShares would be greater due to incorrect addition

    // Assert that the unclaimed shares calculation is correct
    // The user's unclaimedShares from the deposit should be exactly what was recorded
    expect(unclaimedShares).to.equal(userDepositAfter.unclaimedShares);

    // Additional verification: claim should work correctly with the calculated shares
    if (unclaimedShares > 0) {
      await dnGmxJuniorVault.setBalance(user.address, unclaimedShares);
      await instance.connect(user).claim(user.address, unclaimedShares);

      // Verify shares were transferred
      expect(await dnGmxJuniorVault.balanceOf(user.address)).to.equal(unclaimedShares);
    }
  });
});