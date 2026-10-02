import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("DnGmxBatchingManager - kill mutant mfb33305f", function () {
  it("should revert when executeBatchDeposit is called exactly 15 minutes after lastUnpauseTimestamp (strict > check)", async function () {
    const [owner, keeper] = await ethers.getSigners();

    // Deploy mock contracts needed for constructor
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    const usdc = await MockERC20.deploy("USDC", "USDC", 6);

    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const glpManager = await MockGlpManager.deploy();

    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouterV2");
    const rewardRouter = await MockRewardRouter.deploy();

    const MockJuniorVault = await ethers.getContractFactory("MockDnGmxJuniorVault");
    const dnGmxJuniorVault = await MockJuniorVault.deploy();

    // Deploy DnGmxBatchingManager (no constructor args - uses initializer)
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
      keeper.address
    );

    // Set keeper
    await instance.connect(owner).setKeeper(keeper.address);

    // First call executeBatchDeposit to set lastUnpauseTimestamp
    await instance.connect(keeper).executeBatchDeposit();

    // Get the current timestamp after first call
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const lastUnpauseTime = blockBefore.timestamp;

    // Advance time to exactly 15 minutes (900 seconds)
    await time.increaseTo(lastUnpauseTime + 900);

    // Attempt to call executeBatchDeposit at exactly 15 minutes
    // Original requires block.timestamp > lastUnpauseTimestamp + 15 minutes (strict)
    // Mutant allows >= which would succeed here
    await expect(
      instance.connect(keeper).executeBatchDeposit()
    ).to.be.revertedWith("Cooldown period not passed");
  });
});