import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant detection", function () {
  it("should detect mutant that changes addition to subtraction in _notifyReward when notifying reward during ongoing period", async function () {
    const [owner, distributor, staker] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking and rewards
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    const rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const StakingFactory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StakingFactory.deploy(await stakingToken.getAddress(), await distributor.getAddress());
    await staking.waitForDeployment();
    
    // Setup: transfer staking tokens to staker and approve
    await stakingToken.transfer(await staker.getAddress(), ethers.parseEther("1000"));
    await stakingToken.connect(staker).approve(await staking.getAddress(), ethers.parseEther("1000"));
    
    // Owner adds reward token
    await staking.connect(owner).addReward(await rewardToken.getAddress());
    
    // Staker stakes tokens
    await staking.connect(staker).stake(ethers.parseEther("100"));
    
    // First reward notification: 1000 reward tokens over 1 week
    const rewardAmount1 = ethers.parseEther("1000");
    await rewardToken.transfer(await distributor.getAddress(), rewardAmount1);
    await rewardToken.connect(distributor).approve(await staking.getAddress(), rewardAmount1);
    await staking.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount1);
    
    // Fast forward 3 days (midway through the first reward period)
    await ethers.provider.send("evm_increaseTime", [86400 * 3]);
    await ethers.provider.send("evm_mine", []);
    
    // Calculate expected remaining rewards after 3 days
    // Total reward rate = 1000 / 604800 ≈ 0.001652 ethers per second
    // After 3 days (259200 seconds), remaining time = 345600 seconds
    // Remaining rewards (leftover) = 345600 * (1000/604800) = ~571.43 tokens
    
    // Second reward notification: another 500 reward tokens
    const rewardAmount2 = ethers.parseEther("500");
    await rewardToken.transfer(await distributor.getAddress(), rewardAmount2);
    await rewardToken.connect(distributor).approve(await staking.getAddress(), rewardAmount2);
    
    // Get staker's earned rewards before second notification
    const earnedBefore = await staking.earned(await staker.getAddress(), await rewardToken.getAddress());
    
    // Notify second reward
    await staking.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount2);
    
    // Fast forward another 2 days
    await ethers.provider.send("evm_increaseTime", [86400 * 2]);
    await ethers.provider.send("evm_mine", []);
    
    // Get staker's earned rewards after the 2-day period
    const earnedAfter = await staking.earned(await staker.getAddress(), await rewardToken.getAddress());
    const rewardsEarnedIn2Days = earnedAfter - earnedBefore;
    
    // In the ORIGINAL code: new reward rate = (500 + leftover) / 604800
    // leftover ≈ 571.43 tokens (in ethers)
    // new rate ≈ (500 + 571.43) / 604800 ≈ 0.001771 ethers per second
    // Expected rewards in 2 days (172800 seconds) ≈ 0.001771 * 172800 * 100/1000 ≈ 30.6 tokens
    // (staker has 100 out of 1000 total supply, so gets 10% of rewards)
    
    // In the MUTANT code: new reward rate = (500 - leftover) / 604800
    // This would underflow or produce a much smaller rate
    // The mutant would produce significantly fewer rewards
    
    // Calculate expected rewards for original code
    const leftover = (rewardAmount1 * BigInt(86400 * 4)) / BigInt(86400 * 7); // ~571.43 tokens
    const originalNewRate = (rewardAmount2 + leftover) / BigInt(86400 * 7);
    const expectedRewards = (originalNewRate * BigInt(86400 * 2) * ethers.parseEther("100")) / ethers.parseEther("1000");
    
    // The mutant would produce rewards approximately: 
    // mutantNewRate = (rewardAmount2 - leftover) / 604800 which would be very small or zero
    // So the actual rewards should be much less than expected if mutant is present
    
    // Assert that rewards are close to the expected value (within 1% tolerance)
    // If mutant is present, rewards will be significantly less
    const tolerance = expectedRewards / BigInt(100); // 1% tolerance
    expect(rewardsEarnedIn2Days).to.be.closeTo(expectedRewards, tolerance);
  });
});