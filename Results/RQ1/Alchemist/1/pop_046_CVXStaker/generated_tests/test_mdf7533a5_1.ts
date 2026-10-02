import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant mdf7533a5 test", function () {
  it("should kill the mutant by triggering out-of-bounds array access in getReward", async function () {
    const [owner, operator, rewardsRecipient] = await ethers.getSigners();
    
    // Deploy mock contracts needed for CVXStaker constructor
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockERC20.deploy("CLP", "CLP", 18);
    await clpToken.waitForDeployment();
    
    const rewardToken = await MockERC20.deploy("REWARD", "REWARD", 18);
    await rewardToken.waitForDeployment();
    
    // Deploy mock Booster
    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();
    
    // Deploy mock BaseRewardPool
    const MockBaseRewardPool = await ethers.getContractFactory("MockBaseRewardPool");
    const rewardPool = await MockBaseRewardPool.deploy();
    await rewardPool.waitForDeployment();
    
    // Setup booster pool info to point to our reward pool
    await booster.setPoolInfo(
      0,
      await clpToken.getAddress(),
      await rewardPool.getAddress()
    );
    
    // Setup reward pool to return some rewards
    await rewardToken.transfer(await rewardPool.getAddress(), ethers.parseEther("100"));
    await rewardPool.setRewardToken(await rewardToken.getAddress());
    await rewardPool.setBalance(ethers.parseEther("10")); // Some rewards for claiming
    
    const rewardTokens = [await rewardToken.getAddress()];
    
    // Deploy CVXStaker with exactly one reward token
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const staker = await CVXStaker.deploy(
      operator.address,
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await staker.waitForDeployment();
    
    // Set rewards recipient
    await staker.setRewardsRecipient(rewardsRecipient.address);
    
    // Set cvx pool info
    await staker.setCvxPoolInfo(0, await clpToken.getAddress(), await rewardPool.getAddress());
    
    // Fund the staker with some reward tokens (simulating what would happen after getReward call)
    await rewardToken.transfer(await staker.getAddress(), ethers.parseEther("5"));
    
    // Call getReward - the mutant will try to access rewardTokens[1] which doesn't exist
    // The original contract would succeed with i < 1 (only i=0)
    // The mutant with i <= 1 will try i=1 and cause out-of-bounds access
    await expect(
      staker.getReward(false)
    ).to.be.reverted;
  });
});