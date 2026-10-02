import { expect } from "chai";
import { ethers } } from "hardhat";

describe("DnGmxBatchingManager - mutant m8bc05915 depositUsdc round comparison", function () {
  let instance: any;
  let owner: any;
  let user: any;
  let mockSGlp: any;
  let mockUsdc: any;
  let mockRewardRouter: any;
  let mockGlpManager: any;
  let mockGmxUnderlyingVault: any;
  let mockDnGmxJuniorVault: any;
  let keeper: any;

  before(async function () {
    [owner, user, keeper] = await ethers.getSigners();
    
    // Deploy mock contracts for required interfaces
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockSGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    await mockSGlp.waitForDeployment();
    
    mockUsdc = await MockERC20.deploy("USDC", "USDC", 6);
    await mockUsdc.waitForDeployment();
    
    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouterV2");
    mockRewardRouter = await MockRewardRouter.deploy();
    await mockRewardRouter.waitForDeployment();
    
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    mockGlpManager = await MockGlpManager.deploy();
    await mockGlpManager.waitForDeployment();
    
    const MockVault = await ethers.getContractFactory("MockVault");
    mockGmxUnderlyingVault = await MockVault.deploy();
    await mockGmxUnderlyingVault.waitForDeployment();
    
    const MockJuniorVault = await ethers.getContractFactory("MockDnGmxJuniorVault");
    mockDnGmxJuniorVault = await MockJuniorVault.deploy();
    await mockDnGmxJuniorVault.waitForDeployment();
    
    // Link mockGlpManager to mockGmxUnderlyingVault
    await mockGlpManager.setVault(mockGmxUnderlyingVault.target);
    
    // Deploy main contract
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize(
      mockSGlp.target,
      mockUsdc.target,
      mockRewardRouter.target,
      mockGlpManager.target,
      mockDnGmxJuniorVault.target,
      keeper.address
    );
    
    // Setup keeper
    await instance.setKeeper(keeper.address);
    
    // Mint USDC to user for testing
    const usdcAmount = ethers.parseUnits("1000", 6);
    await mockUsdc.mint(user.address, usdcAmount);
    await mockUsdc.connect(user).approve(instance.target, usdcAmount);
  });

  it("should detect mutant by making two deposits in same round and checking usdcBalance is not incorrectly reset", async function () {
    // First deposit in round 1 (current round)
    const firstDepositAmount = ethers.parseUnits("100", 6);
    await instance.connect(user).depositUsdc(firstDepositAmount, user.address);
    
    // Verify first deposit recorded correctly
    let userDeposit = await instance.userDeposits(user.address);
    expect(userDeposit.round).to.equal(1);
    expect(userDeposit.usdcBalance).to.equal(firstDepositAmount);
    expect(userDeposit.unclaimedShares).to.equal(0);
    
    // Second deposit in the same round 1
    const secondDepositAmount = ethers.parseUnits("200", 6);
    await instance.connect(user).depositUsdc(secondDepositAmount, user.address);
    
    // After second deposit, the original contract should:
    // - Keep round = 1 (still current round)
    // - usdcBalance = firstDepositAmount + secondDepositAmount = 300
    // - unclaimedShares still = 0 (no conversion because round is same, not less)
    userDeposit = await instance.userDeposits(user.address);
    
    expect(userDeposit.round).to.equal(1);
    expect(userDeposit.unclaimedShares).to.equal(0);
    
    // The mutant would incorrectly trigger the conversion block because 
    // userDepositRound (1) <= vaultBatchingState.currentRound (1) is true,
    // causing usdcBalance to be reset to 0 and unclaimedShares to be calculated
    // Therefore, if usdcBalance is still 300, the mutant is killed
    expect(userDeposit.usdcBalance).to.equal(firstDepositAmount + secondDepositAmount);
    
    // Also verify round balance accumulated correctly
    const roundBalance = await instance.roundUsdcBalance();
    expect(roundBalance).to.equal(firstDepositAmount + secondDepositAmount);
  });
});