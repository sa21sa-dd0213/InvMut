import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m2aef4d7b (_lastTimeRewardApplicable)", function () {
  it("should calculate correct earned rewards after reward period ends", async function () {
    const [owner, staker] = await ethers.getSigners();

    // Deploy a mock ERC20 for staking token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 for reward token
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();

    // Transfer staking tokens to staker
    await stakingToken.transfer(staker.address, ethers.parseEther("1000"));

    // Add reward token
    await staking.addReward(await rewardToken.getAddress());

    // Transfer reward tokens to owner for funding rewards
    await rewardToken.transfer(owner.address, ethers.parseEther("10000"));

    // Approve staking contract to spend staker's tokens
    await stakingToken.connect(staker).approve(await staking.getAddress(), ethers.parseEther("1000"));

    // Staker stakes tokens
    await staking.connect(staker).stake(ethers.parseEther("100"));

    // Owner approves and notifies reward (1000 tokens over 7 days)
    await rewardToken.approve(await staking.getAddress(), ethers.parseEther("1000"));
    await staking.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("1000"));

    // Record the reward period finish time
    const periodFinish = await staking.rewardPeriodFinish(await rewardToken.getAddress());

    // Fast forward past the reward period finish time
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(periodFinish) + 100]);
    await ethers.provider.send("evm_mine", []);

    // Now check earned rewards - should NOT have increased beyond what was earned during the period
    const earnedAfterPeriod = await staking.earned(staker.address, await rewardToken.getAddress());

    // Fast forward even more
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(periodFinish) + 1000]);
    await ethers.provider.send("evm_mine", []);

    const earnedAfterMoreTime = await staking.earned(staker.address, await rewardToken.getAddress());

    // The earned amount should NOT increase after the reward period has ended
    // Mutant would incorrectly increase this value because _lastTimeRewardApplicable returns block.timestamp instead of _finishTime
    expect(earnedAfterMoreTime).to.equal(earnedAfterPeriod);
  });
});