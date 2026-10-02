import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant detection - periodFinish uses subtraction instead of addition", function () {
  it("should detect mutant by verifying rewards are zero when periodFinish is set in the past", async function () {
    const [owner, staker] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();

    // Add reward token
    await staking.addReward(await rewardToken.getAddress());

    // Transfer staking tokens to staker
    await stakingToken.transfer(staker.address, ethers.parseEther("1000"));

    // Transfer reward tokens to owner (who is also the reward distributor)
    await rewardToken.transfer(owner.address, ethers.parseEther("1000"));

    // Approve staking contract to spend staker's tokens
    await stakingToken.connect(staker).approve(await staking.getAddress(), ethers.parseEther("1000"));

    // Approve staking contract to spend reward tokens
    await rewardToken.approve(await staking.getAddress(), ethers.parseEther("1000"));

    // Notify reward amount - this is where the mutant changes block.timestamp + DURATION to block.timestamp - DURATION
    const rewardAmount = ethers.parseEther("100");
    await staking.notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);

    // Staker stakes tokens
    await staking.connect(staker).stake(ethers.parseEther("100"));

    // Advance time by 1 second to simulate some passage of time
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);

    // Check earned rewards - with mutant, periodFinish is in the past so _lastTimeRewardApplicable returns periodFinish
    // which equals block.timestamp - DURATION, making the time delta negative (or zero after underflow in original calculation)
    const earnedAmount = await staking.connect(staker).earned(staker.address, await rewardToken.getAddress());

    // With the original code, rewards would be > 0 because periodFinish is in the future
    // With the mutant, rewards should be 0 because periodFinish is in the past
    expect(earnedAmount).to.equal(0);

    // Additionally verify that getRewards doesn't transfer any tokens
    const stakerBalanceBefore = await rewardToken.balanceOf(staker.address);
    await staking.connect(staker).getRewards(staker.address);
    const stakerBalanceAfter = await rewardToken.balanceOf(staker.address);

    // With mutant, no rewards should be claimed
    expect(stakerBalanceAfter - stakerBalanceBefore).to.equal(0);
  });
});