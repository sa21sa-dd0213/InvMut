import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant kill test - getReward condition inversion", function () {
  it("should transfer rewards to rewardsRecipient when set, but mutant fails to do so", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock contracts for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const rewardToken = await MockERC20.deploy("Reward", "RWD", 18);
    await rewardToken.waitForDeployment();
    
    const clpToken = await MockERC20.deploy("CLP", "CLP", 18);
    await clpToken.waitForDeployment();
    
    // Deploy mock Booster
    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();
    
    // Deploy mock RewardPool
    const MockRewardPool = await ethers.getContractFactory("MockRewardPool");
    const rewardPool = await MockRewardPool.deploy(await rewardToken.getAddress());
    await rewardPool.waitForDeployment();
    
    // Setup booster pool info
    await booster.setPoolInfo(0, await clpToken.getAddress(), await rewardPool.getAddress());
    
    // Deploy CVXStaker
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const staker = await CVXStaker.deploy(
      await addr1.getAddress(),
      await clpToken.getAddress(),
      await booster.getAddress(),
      [await rewardToken.getAddress()]
    );
    await staker.waitForDeployment();
    
    // Set CVX pool info
    await staker.setCvxPoolInfo(0, await clpToken.getAddress(), await rewardPool.getAddress());
    
    // Set rewards recipient to a non-zero address
    await staker.setRewardsRecipient(await addr2.getAddress());
    
    // Setup: fund reward pool with reward tokens and give staker some rewards
    const rewardAmount = ethers.parseEther("100");
    await rewardToken.mint(await rewardPool.getAddress(), rewardAmount);
    await rewardPool.setBalance(await staker.getAddress(), ethers.parseEther("10"));
    await rewardPool.setEarned(await staker.getAddress(), rewardAmount);
    
    // Record balance before
    const balanceBefore = await rewardToken.balanceOf(await addr2.getAddress());
    
    // Call getReward
    await staker.getReward(false);
    
    // Check that rewards recipient received the tokens
    const balanceAfter = await rewardToken.balanceOf(await addr2.getAddress());
    
    // In original: rewardsRecipient != address(0) => transfer happens => balance increases
    // In mutant: rewardsRecipient == address(0) => transfer does NOT happen => balance stays same
    expect(balanceAfter).to.be.gt(balanceBefore);
  });
});