import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("DnGmxBatchingManager mutant m43c604b6 test", function () {
  it("should kill mutant by testing cooldown period logic after 15 minutes", async function () {
    const [owner, keeper, vault, addr1] = await ethers.getSigners();

    // Deploy mock contracts needed for initialization
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockSGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    await mockSGlp.waitForDeployment();

    const mockUsdc = await MockERC20.deploy("USDC", "USDC", 6);
    await mockUsdc.waitForDeployment();

    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouterV2");
    const mockRewardRouter = await MockRewardRouter.deploy();
    await mockRewardRouter.waitForDeployment();

    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const mockGlpManager = await MockGlpManager.deploy();
    await mockGlpManager.waitForDeployment();

    const MockVault = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment();

    // Set vault address in glpManager
    await mockGlpManager.setVault(await mockVault.getAddress());

    // Deploy mock junior vault
    const MockJuniorVault = await ethers.getContractFactory("MockDnGmxJuniorVault");
    const mockJuniorVault = await MockJuniorVault.deploy();
    await mockJuniorVault.waitForDeployment();

    // Deploy DnGmxBatchingManager
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize(
      await mockSGlp.getAddress(),
      await mockUsdc.getAddress(),
      await mockRewardRouter.getAddress(),
      await mockGlpManager.getAddress(),
      await mockJuniorVault.getAddress(),
      await keeper.getAddress()
    );

    // Set keeper
    await instance.setKeeper(await keeper.getAddress());

    // First unpause to set lastUnpauseTimestamp
    await instance.connect(keeper).unpauseDeposit();

    // Wait for cooldown period (15 minutes + 1 second to be safe)
    await time.increase(16 * 60); // 16 minutes

    // Now try to execute batch deposit - this should succeed in original
    // but fail in mutant because timestamp > lastUnpauseTimestamp + 15 min
    // will fail the mutant's require(block.timestamp < lastUnpauseTimestamp + 15 min)

    // The mutant requires block.timestamp < lastUnpauseTimestamp + 15 minutes
    // Since we waited 16 minutes, block.timestamp > lastUnpauseTimestamp + 15 minutes
    // So the mutant should revert with "Cooldown period not passed"

    await expect(
      instance.connect(keeper).executeBatchDeposit()
    ).to.not.be.reverted;
  });
});