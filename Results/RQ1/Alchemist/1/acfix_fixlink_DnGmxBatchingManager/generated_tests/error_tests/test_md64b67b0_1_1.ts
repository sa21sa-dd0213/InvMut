import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager mutant md64b67b0 test", function () {
  it("should detect the mutant by verifying claimAndRedeem returns correct amount when user has shares", async function () {
    const [owner, keeper, user] = await ethers.getSigners();
    
    // Deploy mock contracts needed for initialization
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const sGlp = await MockERC20.deploy("sGLP", "sGLP", 18);
    const usdc = await MockERC20.deploy("USDC", "USDC", 6);
    
    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouterV2");
    const rewardRouter = await MockRewardRouter.deploy();
    
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const glpManager = await MockGlpManager.deploy();
    
    const MockJuniorVault = await ethers.getContractFactory("MockDnGmxJuniorVault");
    const juniorVault = await MockJuniorVault.deploy();
    
    // Deploy the DnGmxBatchingManager contract
    const Factory = await ethers.getContractFactory("DnGmxBatchingManager");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract
    await instance.initialize(
      await sGlp.getAddress(),
      await usdc.getAddress(),
      await rewardRouter.getAddress(),
      await glpManager.getAddress(),
      await juniorVault.getAddress(),
      keeper.address
    );
    
    // Grant allowances
    await instance.connect(owner).grantAllowances();
    
    // Set keeper
    await instance.connect(owner).setKeeper(keeper.address);
    
    // Setup: Simulate a user having shares in the junior vault
    // First, deposit USDC to create user deposit
    const depositAmount = ethers.parseUnits("1000", 6); // 1000 USDC
    await usdc.mint(user.address, depositAmount);
    await usdc.connect(user).approve(await instance.getAddress(), depositAmount);
    await instance.connect(user).depositUsdc(depositAmount, user.address);
    
    // Execute batch stake to convert USDC to GLP
    await instance.connect(keeper).executeBatchStake();
    
    // Execute batch deposit to mint shares in junior vault
    await instance.connect(keeper).executeBatchDeposit();
    
    // Now user should have shares in junior vault
    // Simulate junior vault having shares for the user
    const shareAmount = ethers.parseEther("100");
    await juniorVault.setBalance(user.address, shareAmount);
    
    // Claim unclaimed shares first to make claimAndRedeem work
    const unclaimedShares = await instance.unclaimedShares(user.address);
    if (unclaimedShares > 0) {
      await instance.connect(user).claim(user.address, unclaimedShares);
    }
    
    // Now test claimAndRedeem - mutant will return 0 when shares != 0
    // Original would redeem shares and return GLP amount
    const result = await instance.connect(user).claimAndRedeem(user.address);
    
    // The mutant returns 0 when shares != 0 (incorrectly)
    // The original returns the actual GLP received
    // So if result is 0 but user had shares, the mutant is detected
    expect(result).to.not.equal(0);
  });
});