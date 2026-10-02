import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager mutant mf290d544 test", function () {
  it("should revert or not execute deposit when roundGlpStaked is zero after batch stake", async function () {
    const [owner, keeper, vault, user] = await ethers.getSigners();

    // Deploy mock contracts for dependencies
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    await sGlp.waitForDeployment();

    const usdc = await MockERC20.deploy("USDC", "USDC", 6);
    await usdc.waitForDeployment();

    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouterV2");
    const rewardRouter = await MockRewardRouter.deploy();
    await rewardRouter.waitForDeployment();

    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const glpManager = await MockGlpManager.deploy();
    await glpManager.waitForDeployment();

    const MockJuniorVault = await ethers.getContractFactory("MockDnGmxJuniorVault");
    const dnGmxJuniorVault = await MockJuniorVault.deploy();
    await dnGmxJuniorVault.waitForDeployment();

    // Deploy DnGmxBatchingManager
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize(
      await sGlp.getAddress(),
      await usdc.getAddress(),
      await rewardRouter.getAddress(),
      await glpManager.getAddress(),
      await dnGmxJuniorVault.getAddress(),
      await keeper.getAddress()
    );

    // Set keeper
    await instance.connect(owner).setKeeper(await keeper.getAddress());

    // Set vault permissions (mock vault needs to be set as dnGmxJuniorVault)
    // Transfer some USDC to user for deposit
    await usdc.mint(await user.getAddress(), ethers.parseUnits("1000", 6));

    // User approves and deposits USDC
    await usdc.connect(user).approve(await instance.getAddress(), ethers.parseUnits("1000", 6));
    await instance.connect(user).depositUsdc(ethers.parseUnits("100", 6), await user.getAddress());

    // Verify roundUsdcBalance is set
    expect(await instance.roundUsdcBalance()).to.equal(ethers.parseUnits("100", 6));

    // Execute batch stake (this should set roundGlpStaked to non-zero)
    // Mock the reward router to return a non-zero amount
    await rewardRouter.setMintAndStakeGlpReturn(ethers.parseUnits("50", 18)); // Mock GLP amount

    // Unpause first (since executeBatchStake calls _pause at end)
    await instance.connect(keeper).unpauseDeposit();

    // Execute batch stake
    await instance.connect(keeper).executeBatchStake();

    // After executeBatchStake, roundGlpStaked should be non-zero
    const roundGlpStakedAfterStake = await instance.roundGlpStaked();
    expect(roundGlpStakedAfterStake).to.not.equal(0);

    // The contract should now be paused (executeBatchStake pauses it)

    // Now execute batch deposit - in original code, this should proceed because roundGlpStaked != 0
    // In mutant, this would return early because roundGlpStaked != 0 (mutant checks != instead of ==)

    // Mock junior vault deposit to return some shares
    await dnGmxJuniorVault.setDepositReturn(ethers.parseUnits("40", 18));

    // Execute batch deposit
    const tx = await instance.connect(keeper).executeBatchDeposit();
    const receipt = await tx.wait();

    // Check that BatchDeposit event was emitted (original behavior)
    // Mutant would not emit this event because it returns early
    const event = receipt.logs.find(
      (log) => log.eventName === "BatchDeposit"
    );

    // For original contract, event should be emitted
    // For mutant, event would NOT be emitted (test fails for mutant)
    expect(event).to.not.be.undefined;

    // Additionally, verify roundGlpStaked was reset to 0 in original (mutant leaves it non-zero)
    const roundGlpStakedAfterDeposit = await instance.roundGlpStaked();
    expect(roundGlpStakedAfterDeposit).to.equal(0);

    // Verify round was incremented
    const currentRound = await instance.currentRound();
    expect(currentRound).to.equal(2);
  });
});