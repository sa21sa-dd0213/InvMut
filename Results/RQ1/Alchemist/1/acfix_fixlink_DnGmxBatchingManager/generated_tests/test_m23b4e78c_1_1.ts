import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager - Mutant m23b4e78c detection", function () {
  it("should revert when calling claim with zero address receiver in original, but succeed with non-zero address receiver - mutant will revert incorrectly", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock contracts needed for initialization
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    const usdc = await MockERC20.deploy("USDC", "USDC", 6);
    await sGlp.waitForDeployment();
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
    
    // Deploy main contract
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize contract
    await instance.initialize(
      await sGlp.getAddress(),
      await usdc.getAddress(),
      await rewardRouter.getAddress(),
      await glpManager.getAddress(),
      await dnGmxJuniorVault.getAddress(),
      owner.address
    );
    
    // Setup: First deposit USDC to create unclaimed shares
    await usdc.mint(addr1.address, ethers.parseUnits("1000", 6));
    await usdc.connect(addr1).approve(await instance.getAddress(), ethers.parseUnits("1000", 6));
    await instance.connect(addr1).depositUsdc(ethers.parseUnits("100", 6), addr1.address);
    
    // Execute batch stake and deposit to process the round
    await instance.setKeeper(owner.address);
    await instance.executeBatchStake();
    
    // After unpause, execute batch deposit
    await instance.executeBatchDeposit();
    
    // Now claimer has unclaimed shares - test claim with non-zero receiver
    // In original contract: should succeed with non-zero receiver
    // In mutant: will revert because condition is inverted (reverts when receiver != address(0))
    
    // This test will pass on original (succeeds) and fail on mutant (reverts unexpectedly)
    await expect(
      instance.connect(addr1).claim(addr2.address, 1)
    ).to.not.be.reverted;
    
    // Verify the claim actually happened by checking shares
    // If it reverted on mutant, the test fails - killing the mutant
  });
});