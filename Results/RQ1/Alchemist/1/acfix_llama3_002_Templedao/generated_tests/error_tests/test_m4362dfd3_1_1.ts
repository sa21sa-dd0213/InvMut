import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant m4362dfd3 (_notifyReward periodFinish)", function () {
  it("should kill mutant by verifying rewards accumulate over time after notifyRewardAmount", async function () {
    const [owner, staker] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockTokenFactory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockTokenFactory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a mock reward token
    const rewardToken = await MockTokenFactory.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const StaxLPStakingFactory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStakingFactory.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();

    // Add reward token
    await staking.addReward(await rewardToken.getAddress());

    // Transfer staking tokens to staker and approve
    await stakingToken.transfer(staker.address, ethers.parseEther("1000"));
    await stakingToken.connect(staker).approve(await staking.getAddress(), ethers.parseEther("1000"));

    // Stake tokens
    await staking.connect(staker).stake(ethers.parseEther("100"));

    // Transfer reward tokens to owner (distributor) and approve
    await rewardToken.transfer(owner.address, ethers.parseEther("1000"));
    await rewardToken.connect(owner).approve(await staking.getAddress(), ethers.parseEther("1000"));

    // Notify reward amount - 1000 tokens over 7 days
    const rewardAmount = ethers.parseEther("1000");
    await staking.connect(owner).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);

    // Record the period finish time
    const periodFinish = await staking.rewardPeriodFinish(await rewardToken.getAddress());

    // Advance time by 1 day (86400 seconds) to allow some rewards to accumulate
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);

    // Check that the period finish is in the future (original behavior)
    // In the mutant, periodFinish = block.timestamp - DURATION, so it would be in the past
    const currentTime = (await ethers.provider.getBlock("latest"))!.timestamp;

    // If mutant, periodFinish would be < currentTime, meaning rewards should have stopped
    // In original, periodFinish would be > currentTime, meaning rewards still accumulating
    const earned = await staking.earned(staker.address, await rewardToken.getAddress());

    // The earned rewards should be greater than 0 after 1 day
    // In the mutant, periodFinish is in the past, so _lastTimeRewardApplicable returns periodFinish
    // which is block.timestamp - DURATION, meaning no rewards would have accumulated
    expect(earned).to.be.gt(0);

    // Additional verification: check that periodFinish is in the future for original
    // For mutant: periodFinish would be block.timestamp - 7 days (in the past)
    expect(periodFinish).to.be.gt(currentTime);
  });
});