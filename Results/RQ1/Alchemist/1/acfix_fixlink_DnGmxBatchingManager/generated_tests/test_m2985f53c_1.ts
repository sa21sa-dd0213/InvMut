import { expect } from "chai";
import { ethers } from "hardhat";

describe("DnGmxBatchingManager - mutant m2985f53c", function () {
  it("should return 0 unclaimed shares when user has zero usdcBalance and round < currentRound", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy mock contracts needed for initialization
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockGlpManager = await ethers.getContractFactory("MockGlpManager");
    const MockRewardRouter = await ethers.getContractFactory("MockRewardRouter");
    const MockVault = await ethers.getContractFactory("MockVault");
    const MockJuniorVault = await ethers.getContractFactory("MockJuniorVault");
    
    const sGlp = await MockERC20.deploy("sGLP", "sGLP");
    const usdc = await MockERC20.deploy("USDC", "USDC");
    const glpManager = await MockGlpManager.deploy();
    const rewardRouter = await MockRewardRouter.deploy();
    const gmxUnderlyingVault = await MockVault.deploy();
    const juniorVault = await MockJuniorVault.deploy();
    
    await glpManager.setVault(gmxUnderlyingVault.address);
    
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
      owner.address
    );
    
    // Set currentRound to 2 by performing a batch deposit cycle
    // First, we need to have some usdc balance and execute batch stake/deposit
    const depositAmount = ethers.parseEther("1000");
    await usdc.mint(owner.address, depositAmount);
    await usdc.approve(instance.address, depositAmount);
    
    // Deposit USDC for user
    await instance.depositUsdc(depositAmount, user.address);
    
    // Set keeper and execute batch operations to advance round
    await instance.setKeeper(owner.address);
    
    // Mock the necessary calls for executeBatchStake
    const mockPrice = ethers.parseUnits("1", 30); // 1 USD with 30 decimals
    await gmxUnderlyingVault.setMinPrice(usdc.address, mockPrice);
    await rewardRouter.setMintAndStakeGlpReturn(depositAmount);
    
    // Execute batch stake
    await instance.executeBatchStake();
    
    // Execute batch deposit
    await instance.executeBatchDeposit();
    
    // Now currentRound should be 2
    const currentRound = await instance.currentRound();
    expect(currentRound).to.equal(2);
    
    // User's deposit should be from round 1, so round < currentRound
    const userDeposit = await instance.userDeposits(user.address);
    expect(userDeposit.round).to.be.lessThan(currentRound);
    
    // The user's usdcBalance should be 0 after the batch deposit processed their deposit
    // (since their usdc was used in the batch)
    expect(userDeposit.usdcBalance).to.equal(0);
    
    // Call unclaimedShares - in original contract this should return 0
    // because usdcBalance > 0 check fails when balance is 0
    // In mutant, usdcBalance >= 0 is always true, so it would try to calculate shares incorrectly
    const unclaimed = await instance.unclaimedShares(user.address);
    expect(unclaimed).to.equal(0);
  });
});