import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant md27a125c (_lastTimeRewardApplicable)", function () {
  it("should correctly calculate earned rewards during an active reward period", async function () {
    const [owner, staker] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();
    
    // Add reward token
    await staking.addReward(await rewardToken.getAddress());
    
    // Transfer staking tokens to staker
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.transfer(staker.address, stakeAmount);
    
    // Staker stakes tokens
    await stakingToken.connect(staker).approve(await staking.getAddress(), stakeAmount);
    await staking.connect(staker).stake(stakeAmount);
    
    // Transfer reward tokens to owner (distributor)
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.transfer(owner.address, rewardAmount);
    
    // Notify reward (7 day duration)
    await rewardToken.connect(owner).approve(await staking.getAddress(), rewardAmount);
    await staking.connect(owner).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Get earned rewards immediately after notification
    const earnedBefore = await staking.connect(staker).earned(staker.address, await rewardToken.getAddress());
    
    // Mine blocks to advance time by 1 day (86400 seconds)
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);
    
    // Get earned rewards after 1 day
    const earnedAfter = await staking.connect(staker).earned(staker.address, await rewardToken.getAddress());
    
    // In the original contract, rewards should accumulate over time
    // In the mutant, the reward calculation will be incorrect and rewards won't increase properly
    expect(earnedAfter).to.be.gt(earnedBefore);
    
    // Verify the reward rate is reasonable: after 1 day, should have earned ~1/7 of total rewards
    // 1000 tokens / 7 days ≈ 142.857 tokens per day for 100 staked out of 100 total supply
    const expectedEarned = ethers.parseEther("142"); // ~142 tokens expected after 1 day
    expect(earnedAfter).to.be.closeTo(expectedEarned, ethers.parseEther("1"));
  });
});