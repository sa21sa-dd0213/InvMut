import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager - kill mutant m79167f19 (depositUsdc amount check)", function () {
  it("should allow depositUsdc with non-zero amount (mutant incorrectly reverts on non-zero)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock USDC token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USDC", "USDC", 6);
    await usdc.waitForDeployment();
    
    // Deploy mock sGLP token
    const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    await sGlp.waitForDeployment();
    
    // Deploy mock RewardRouterV2
    const MockRewardRouterV2 = await ethers.getContractFactory("MockRewardRouterV2");
    const rewardRouter = await MockRewardRouterV2.deploy();
    await rewardRouter.waitForDeployment();
    
    // Deploy mock GlpManager
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const glpManager = await MockGlpManager.deploy();
    await glpManager.waitForDeployment();
    
    // Deploy mock DnGmxJuniorVault
    const MockDnGmxJuniorVault = await ethers.getContractFactory("MockDnGmxJuniorVault");
    const dnGmxJuniorVault = await MockDnGmxJuniorVault.deploy();
    await dnGmxJuniorVault.waitForDeployment();
    
    // Deploy main contract
    const DnGmxBatchingManager = await ethers.getContractFactory("DnGmxBatchingManager");
    const manager = await DnGmxBatchingManager.deploy();
    await manager.waitForDeployment();
    
    // Initialize the contract
    await manager.initialize(
      await sGlp.getAddress(),
      await usdc.getAddress(),
      await rewardRouter.getAddress(),
      await glpManager.getAddress(),
      await dnGmxJuniorVault.getAddress(),
      owner.address
    );
    
    // Mint USDC to addr1 and approve
    const depositAmount = ethers.parseUnits("1000", 6); // 1000 USDC
    await usdc.mint(addr1.address, depositAmount);
    await usdc.connect(addr1).approve(await manager.getAddress(), depositAmount);
    
    // The mutant changes "if (amount == 0)" to "if (amount != 0)"
    // Original: reverts when amount == 0
    // Mutant: reverts when amount != 0 (any positive amount)
    // So calling with non-zero amount should revert in mutant but succeed in original
    
    // Test: call depositUsdc with non-zero amount - should NOT revert in original
    await expect(
      manager.connect(addr1).depositUsdc(depositAmount, addr1.address)
    ).to.not.be.reverted;
    
    // Verify the deposit was recorded
    expect(await manager.usdcBalance(addr1.address)).to.equal(depositAmount);
  });
});