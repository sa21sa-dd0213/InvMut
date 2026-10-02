import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant detection - m1bff88a2", function () {
  it("should detect the _rewardPerToken mutation (replacing - with +) by verifying that earned rewards are bounded by the reward rate multiplied by the duration", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();

    // Fund user with staking tokens
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.transfer(user.address, stakeAmount);

    // User approves staking contract
    await stakingToken.connect(user).approve(await staking.getAddress(), stakeAmount);

    // Owner adds reward token and notifies reward
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.approve(await staking.getAddress(), rewardAmount);
    await staking.addReward(await rewardToken.getAddress());
    await staking.notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);

    // User stakes tokens
    await staking.connect(user).stake(stakeAmount);

    // Advance time by half the reward duration (3.5 days)
    const duration = 86400 * 7; // DURATION constant
    await ethers.provider.send("evm_increaseTime", [Math.floor(duration / 2)]);
    await ethers.provider.send("evm_mine", []);

    // Check earned rewards
    const earnedRewards = await staking.earned(user.address, await rewardToken.getAddress());

    // Calculate expected maximum reward for half the duration
    const totalSupply = await staking.totalSupply();
    const expectedMaxReward = (stakeAmount * rewardAmount * BigInt(Math.floor(duration / 2))) / (BigInt(duration) * totalSupply);

    // The mutant with + instead of - will produce an astronomically large value
    // because it adds the timestamp (lastUpdateTime) instead of subtracting it.
    // A reasonable earned reward should be less than the total reward amount
    expect(earnedRewards).to.be.lessThan(rewardAmount);

    // Additionally, the earned reward should not exceed the maximum possible
    // (stakeRatio * totalReward * elapsedTime / DURATION)
    expect(earnedRewards).to.be.lessThanOrEqual(expectedMaxReward + ethers.parseEther("0.01")); // small tolerance for rounding
  });
});