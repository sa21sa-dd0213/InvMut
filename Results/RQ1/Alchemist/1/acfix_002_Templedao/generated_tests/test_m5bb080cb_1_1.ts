import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m5bb080cb detection", function () {
  it("should detect the division-to-substitution mutation in _notifyReward by verifying reward rate calculation", async function () {
    const [owner, distributor, staker] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockTokenFactory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockTokenFactory.deploy("Staking Token", "STK");
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockTokenFactory.deploy("Reward Token", "RWD");
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking with staking token and distributor
    const StaxLPStakingFactory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStakingFactory.deploy(
      await stakingToken.getAddress(),
      distributor.address
    );
    await staking.waitForDeployment();

    // Add reward token
    await staking.connect(owner).addReward(await rewardToken.getAddress());

    // Fund staker with staking tokens
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.transfer(staker.address, stakeAmount);
    await stakingToken.connect(staker).approve(await staking.getAddress(), stakeAmount);

    // Stake tokens
    await staking.connect(staker).stake(stakeAmount);

    // First reward notification (start a reward period)
    const firstRewardAmount = ethers.parseEther("1000");
    await rewardToken.transfer(distributor.address, firstRewardAmount);
    await rewardToken.connect(distributor).approve(await staking.getAddress(), firstRewardAmount);

    await staking.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      firstRewardAmount
    );

    // Get initial reward rate
    const rewardData = await staking.rewardData(await rewardToken.getAddress());
    const initialRate = rewardData.rewardRate;

    // Wait for some time to pass within the current reward period
    await ethers.provider.send("evm_increaseTime", [86400 * 3]); // 3 days
    await ethers.provider.send("evm_mine", []);

    // Second reward notification while first period is still ongoing
    const secondRewardAmount = ethers.parseEther("500");
    await rewardToken.transfer(distributor.address, secondRewardAmount);
    await rewardToken.connect(distributor).approve(await staking.getAddress(), secondRewardAmount);

    await staking.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      secondRewardAmount
    );

    // Get updated reward rate after second notification
    const updatedRewardData = await staking.rewardData(await rewardToken.getAddress());
    const updatedRate = updatedRewardData.rewardRate;

    // Calculate expected rate for original contract:
    // remaining time = periodFinish - block.timestamp
    // leftover = remaining * initialRate
    // newRate = (secondRewardAmount + leftover) / DURATION
    const DURATION = 86400 * 7;
    const periodFinish = updatedRewardData.periodFinish;
    const blockTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
    const remaining = periodFinish - blockTimestamp;
    const leftover = remaining * Number(initialRate);
    const expectedRate = Math.floor((Number(secondRewardAmount) + leftover) / DURATION);

    // For the mutant, the rate would be: (secondRewardAmount + leftover) - DURATION
    const mutantRate = Number(secondRewardAmount) + leftover - DURATION;

    // Assert that the actual rate matches the original (division) calculation
    // If the mutant is present, this assertion will fail
    expect(Number(updatedRate)).to.equal(expectedRate);

    // Additional verification: check that earned rewards are correct
    const earnedBefore = await staking.earned(staker.address, await rewardToken.getAddress());

    // Wait some more time and check earnings increase correctly
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 more day
    await ethers.provider.send("evm_mine", []);

    const earnedAfter = await staking.earned(staker.address, await rewardToken.getAddress());
    const expectedEarnedIncrease = stakeAmount * BigInt(Number(updatedRate)) * BigInt(86400) / ethers.parseEther("1");

    // If mutant is present, the earnings will be incorrect
    expect(earnedAfter - earnedBefore).to.equal(expectedEarnedIncrease);
  });
});