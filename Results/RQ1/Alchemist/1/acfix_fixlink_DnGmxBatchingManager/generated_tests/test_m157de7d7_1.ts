import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager - mutant m157de7d7 (receiver == address(0) changed to !=)", function () {
  it("should succeed when depositing USDC with a valid non-zero receiver address (kills mutant that inverts the zero-address check)", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy mock ERC20 for USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USDC", "USDC", 6);
    await usdc.waitForDeployment();
    
    // Deploy mock sGlp
    const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    await sGlp.waitForDeployment();
    
    // Deploy mock RewardRouterV2
    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouterV2");
    const rewardRouter = await MockRewardRouter.deploy();
    await rewardRouter.waitForDeployment();
    
    // Deploy mock GlpManager
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const glpManager = await MockGlpManager.deploy();
    await glpManager.waitForDeployment();
    
    // Deploy mock DnGmxJuniorVault
    const MockJuniorVault = await ethers.getContractFactory("MockDnGmxJuniorVault");
    const dnGmxJuniorVault = await MockJuniorVault.deploy();
    await dnGmxJuniorVault.waitForDeployment();
    
    // Deploy the main contract
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
      owner.address
    );
    
    // Fund user with USDC and approve
    const depositAmount = ethers.parseUnits("1000", 6);
    await usdc.mint(user.address, depositAmount);
    await usdc.connect(user).approve(await instance.getAddress(), depositAmount);
    
    // Unpause deposits (contract starts paused, need keeper to unpause)
    // Set keeper first
    await instance.setKeeper(owner.address);
    await instance.unpauseDeposit();
    
    // Test: deposit with a valid non-zero receiver should succeed
    // In the mutant, this would revert because receiver != address(0) triggers the revert
    // In the original, it succeeds because receiver == address(0) check passes
    await expect(
      instance.connect(user).depositUsdc(depositAmount, user.address)
    ).to.not.be.reverted;
    
    // Verify the deposit was recorded
    const userDeposit = await instance.userDeposits(user.address);
    expect(userDeposit.usdcBalance).to.equal(depositAmount);
    expect(userDeposit.round).to.equal(1);
  });
});