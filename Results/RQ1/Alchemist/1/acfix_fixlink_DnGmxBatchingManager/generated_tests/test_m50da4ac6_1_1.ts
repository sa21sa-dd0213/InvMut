import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager - Kill mutant m50da4ac6", function () {
  it("should revert when executing batch stake with incorrect minUsdg calculation due to exponentiation operator", async function () {
    const [owner, keeper, vault] = await ethers.getSigners();
    
    // Deploy mock contracts needed for the batching manager
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockGLPManager = await ethers.getContractFactory("MockGLPManager");
    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouter");
    const MockVault = await ethers.getContractFactory("MockVault");
    const MockJuniorVault = await ethers.getContractFactory("MockDnGmxJuniorVault");
    
    const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    const usdc = await MockERC20.deploy("USDC", "USDC", 6);
    const glpManager = await MockGLPManager.deploy();
    const rewardRouter = await MockRewardRouter.deploy();
    const gmxUnderlyingVault = await MockVault.deploy();
    const juniorVault = await MockJuniorVault.deploy();
    
    // Setup mock returns
    await glpManager.setVault(gmxUnderlyingVault.address);
    await gmxUnderlyingVault.setMinPrice(ethers.parseUnits("1", 6)); // 1 USDC price
    
    // Deploy the batching manager
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize(
      sGlp.address,
      usdc.address,
      rewardRouter.address,
      glpManager.address,
      juniorVault.address,
      keeper.address
    );
    
    // Set keeper and slippage threshold
    await instance.setKeeper(keeper.address);
    await instance.setThresholds(100); // 1% slippage
    
    // Setup: mint USDC to vault and approve
    const depositAmount = ethers.parseUnits("1000", 6); // 1000 USDC
    await usdc.mint(vault.address, depositAmount);
    await usdc.connect(vault).approve(instance.address, depositAmount);
    
    // Vault deposits USDC via depositToken to set up roundUsdcBalance
    await instance.connect(vault).depositToken(usdc.address, depositAmount, 0);
    
    // Setup mock reward router to return a specific GLP amount
    await rewardRouter.setMintAndStakeGlpReturn(ethers.parseUnits("500", 18)); // 500 GLP
    
    // Unpause to allow batch stake
    await instance.unpauseDeposit();
    
    // Execute batch stake - should fail with the mutant because price ** 1e12 creates enormous minUsdg
    // In the original: price * 1e12 = 1e6 * 1e12 = 1e18 (reasonable)
    // In the mutant: price ** 1e12 = (1e6) ** 1e12 = astronomically large number causing overflow or revert
    await expect(
      instance.connect(keeper).executeBatchStake()
    ).to.be.reverted;
  });
});