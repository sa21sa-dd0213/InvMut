import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant ma58ef563", function () {
  it("should detect when _notifyReward uses addition instead of subtraction for remaining time calculation", async function () {
    const [owner, distributor, user] = await ethers.getSigners();

    // Deploy a mock ERC20 for staking token and reward token
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK");
    await stakingToken.waitForDeployment();

    const rewardToken = await ERC20Factory.deploy("Reward Token", "RWD");
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const StaxLPStakingFactory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStakingFactory.deploy(
      await stakingToken.getAddress(),
      distributor.address
    );
    await staking.waitForDeployment();

    // Add reward token
    await staking.connect(owner).addReward(await rewardToken.getAddress());

    // Fund user with staking tokens
    const stakeAmount = ethers.parseEther("1000");
    await stakingToken.transfer(user.address, stakeAmount);
    await stakingToken.connect(user).approve(await staking.getAddress(), stakeAmount);

    // User stakes tokens
    await staking.connect(user).stake(stakeAmount);

    // Fund distributor with reward tokens
    const rewardAmount = ethers.parseEther("100");
    await rewardToken.transfer(distributor.address, rewardAmount);
    await rewardToken.connect(distributor).approve(await staking.getAddress(), rewardAmount);

    // First reward notification - start a reward period
    await staking.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      rewardAmount
    );

    // Get the period finish time
    const periodFinish = await staking.rewardPeriodFinish(await rewardToken.getAddress());

    // Fast forward to half of the period (before it ends)
    const duration = 86400 * 7; // DURATION = 7 days
    await ethers.provider.send("evm_increaseTime", [duration / 2]);
    await ethers.provider.send("evm_mine", []);

    // Get current block timestamp
    const blockBefore = await ethers.provider.getBlock("latest");
    const timestampBefore = blockBefore!.timestamp;

    // Verify we are still before period finish
    expect(timestampBefore).to.be.lessThan(Number(periodFinish));

    // Second reward notification - this triggers _notifyReward with remaining time calculation
    const secondRewardAmount = ethers.parseEther("50");
    await rewardToken.transfer(distributor.address, secondRewardAmount);
    await rewardToken.connect(distributor).approve(await staking.getAddress(), secondRewardAmount);

    await staking.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      secondRewardAmount
    );

    // Fast forward to the end of the new period
    await ethers.provider.send("evm_increaseTime", [duration]);
    await ethers.provider.send("evm_mine", []);

    // Claim rewards
    await staking.connect(user).getRewards(user.address);

    // Get the earned rewards
    const earnedRewards = await staking.claimableRewards(
      user.address,
      await rewardToken.getAddress()
    );

    // With the original (correct) subtraction, remaining = periodFinish - block.timestamp
    // This gives a small leftover, and the reward rate is calculated properly
    // With the mutant (addition), remaining = periodFinish + block.timestamp
    // This gives a huge remaining value, leading to a massively inflated reward rate
    // The user would receive much more than expected

    // The correct reward should be approximately:
    // First period: 100 tokens over 7 days, user gets half = 50 tokens
    // Second period: (50 + leftover) / DURATION rate, user gets full period = 50 tokens
    // Total expected: ~100 tokens (approximately, with some rounding)

    // The mutant would produce a reward significantly larger than 100 tokens
    // because remaining = periodFinish + block.timestamp is huge
    // resulting in a huge leftover and inflated reward rate

    // Assert that rewards are within reasonable bounds (kills the mutant)
    const expectedMaxReward = ethers.parseEther("200"); // 2x the maximum reasonable amount
    expect(earnedRewards).to.be.lessThanOrEqual(expectedMaxReward);

    // Additional check: if the mutant is present, rewards will be astronomically high
    // The original would produce ~100 tokens, the mutant would produce thousands+
    const reasonableMinReward = ethers.parseEther("10"); // At least some rewards
    const reasonableMaxReward = ethers.parseEther("500"); // Should not exceed 500
    expect(earnedRewards).to.be.gte(reasonableMinReward);
    expect(earnedRewards).to.be.lte(reasonableMaxReward);
  });
});