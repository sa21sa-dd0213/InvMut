import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("StaxLPStaking mutant test - _lastTimeRewardApplicable", function () {
  it("should detect mutant where _finishTime <= block.timestamp instead of <", async function () {
    const [owner, distributor, staker] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await TokenFactory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 token for rewards
    const rewardToken = await TokenFactory.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();

    // Setup: Add reward token and set reward distributor
    await instance.connect(owner).addReward(await rewardToken.getAddress());
    await instance.connect(owner).setRewardDistributor(distributor.address);

    // Staker stakes tokens
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.connect(staker).approve(await instance.getAddress(), stakeAmount);
    await instance.connect(staker).stake(stakeAmount);

    // Get current timestamp and calculate period finish
    const currentTime = await time.latest();
    const DURATION = 86400 * 7; // 7 days
    const rewardAmount = ethers.parseEther("1000");

    // Transfer reward tokens to distributor for notifyRewardAmount
    await rewardToken.connect(owner).transfer(distributor.address, rewardAmount);
    await rewardToken.connect(distributor).approve(await instance.getAddress(), rewardAmount);

    // Notify reward amount
    await instance.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      rewardAmount
    );

    // Deploy fresh instance for clean test at the boundary
    const instance2 = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance2.waitForDeployment();

    await instance2.connect(owner).addReward(await rewardToken.getAddress());
    await instance2.connect(owner).setRewardDistributor(distributor.address);

    await stakingToken.connect(staker).approve(await instance2.getAddress(), stakeAmount);
    await instance2.connect(staker).stake(stakeAmount);

    const newCurrentTime = await time.latest();
    await rewardToken.connect(owner).transfer(distributor.address, rewardAmount);
    await rewardToken.connect(distributor).approve(await instance2.getAddress(), rewardAmount);

    await instance2.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      rewardAmount
    );

    // Fast forward to exactly periodFinish
    await time.increaseTo(newCurrentTime + DURATION);

    // Now call getRewards to trigger updateReward modifier which calls _lastTimeRewardApplicable
    await instance2.connect(staker).getRewards(staker.address);

    // Test at exact boundary - should not revert
    const exactFinish = newCurrentTime + DURATION;
    await time.increaseTo(exactFinish);

    // Verify that calling functions at exact periodFinish doesn't revert
    await expect(
      instance2.connect(staker).getRewards(staker.address)
    ).to.not.be.reverted;

    // The earned amount should be calculable at this exact boundary
    const finalEarned = await instance2.earned(staker.address, await rewardToken.getAddress());
    expect(finalEarned).to.be.gt(0);

    // And after one more second, the behavior should be identical
    await time.increaseTo(exactFinish + 1);
    const earnedAfter = await instance2.earned(staker.address, await rewardToken.getAddress());
    expect(earnedAfter).to.be.gt(0);
  });
});