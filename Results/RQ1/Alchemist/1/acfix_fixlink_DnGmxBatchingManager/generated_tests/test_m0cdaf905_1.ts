import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("DnGmxBatchingManager - Kill mutant m0cdaf905 (cooldown check)", function () {
  let instance: any;
  let owner: any;
  let keeper: any;
  let mockSGlp: any;
  let mockUsdc: any;
  let mockRewardRouter: any;
  let mockGlpManager: any;
  let mockVault: any;
  let mockJuniorVault: any;

  beforeEach(async function () {
    [owner, keeper] = await ethers.getSigners();

    // Deploy mock contracts
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockSGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    mockUsdc = await MockERC20.deploy("USDC", "USDC", 6);

    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouterV2");
    mockRewardRouter = await MockRewardRouter.deploy();

    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    mockGlpManager = await MockGlpManager.deploy();

    const MockVault = await ethers.getContractFactory("MockVault");
    mockVault = await MockVault.deploy();

    const MockJuniorVault = await ethers.getContractFactory("MockJuniorVault");
    mockJuniorVault = await MockJuniorVault.deploy();

    // Set up mockGlpManager to return mockVault address
    await mockGlpManager.setVault(mockVault.target);

    // Deploy DnGmxBatchingManager
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize(
      mockSGlp.target,
      mockUsdc.target,
      mockRewardRouter.target,
      mockGlpManager.target,
      mockJuniorVault.target,
      keeper.address
    );

    // Set keeper
    await instance.connect(owner).setKeeper(keeper.address);
  });

  it("should revert if executeBatchDeposit is called twice within 15 minutes (original behavior), but mutant would allow it", async function () {
    // First, unpause the contract by calling executeBatchDeposit
    // The cooldown starts from the unpause that happens inside executeBatchDeposit
    
    // Set up conditions for executeBatchDeposit to proceed:
    // Need dnGmxJuniorVaultGlpBalance > 0 to trigger the vault deposit path
    // Also need roundGlpStaked to be 0 for the internal function to return early
    
    // Call executeBatchDeposit for the first time - this will unpause and start the cooldown
    await instance.connect(keeper).executeBatchDeposit();
    
    // Wait only 5 minutes (less than 15 minutes cooldown)
    await time.increase(5 * 60);
    
    // Attempt to call executeBatchDeposit again within the cooldown period
    // Original: should revert because block.timestamp <= lastUnpauseTimestamp + 15 minutes
    // Mutant: would pass because block.timestamp > lastUnpauseTimestamp - 15 minutes is always true
    await expect(
      instance.connect(keeper).executeBatchDeposit()
    ).to.be.revertedWith("Cooldown period not passed");
  });
});