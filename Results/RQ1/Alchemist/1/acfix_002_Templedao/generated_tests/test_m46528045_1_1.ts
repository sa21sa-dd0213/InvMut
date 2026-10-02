import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant m46528045 (exponentiation instead of multiplication in _notifyReward)", function () {
  it("should detect when exponentiation is used instead of multiplication for leftover calculation in _notifyReward", async function () {
    const [owner, distributor, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), await distributor.getAddress());
    await instance.waitForDeployment();
    
    // Add reward token
    await instance.connect(owner).addReward(await rewardToken.getAddress());
    
    // Transfer reward tokens to distributor
    await rewardToken.connect(owner).transfer(await distributor.getAddress(), ethers.parseEther("10000"));
    await rewardToken.connect(distributor).approve(await instance.getAddress(), ethers.parseEther("10000"));
    
    // First notification: set initial reward rate
    const initialRewardAmount = ethers.parseEther("1000"); // 1000 tokens over 7 days
    await instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), initialRewardAmount);
    
    // Get the period finish time after first notification
    const periodFinish = await instance.rewardPeriodFinish(await rewardToken.getAddress());
    
    // Advance time to be halfway through the reward period (so we have remaining time)
    const halfDuration = 86400 * 7 / 2; // 3.5 days
    await ethers.provider.send("evm_increaseTime", [halfDuration]);
    await ethers.provider.send("evm_mine", []);
    
    // Now call notifyRewardAmount again while period is still active
    // This will trigger the leftover calculation: remaining * rewardRate vs remaining ** rewardRate
    const secondRewardAmount = ethers.parseEther("500"); // 500 tokens
    await instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), secondRewardAmount);
    
    // Get the reward data after the second notification
    const rewardData = await instance.rewardData(await rewardToken.getAddress());
    
    // Calculate what the reward rate SHOULD be with multiplication:
    // remaining = periodFinish - currentTimestamp
    // currentTimestamp should be periodFinish - halfDuration
    const expectedRemaining = 86400 * 7 / 2; // 3.5 days in seconds
    const initialRewardRate = Number(initialRewardAmount) / (86400 * 7);
    const expectedLeftover = expectedRemaining * initialRewardRate;
    const expectedNewRewardRate = Math.floor((Number(secondRewardAmount) + expectedLeftover) / (86400 * 7));
    
    // With exponentiation, leftover = remaining ** rewardRate which would be astronomically large
    // and the reward rate would be vastly different
    const actualRewardRate = Number(rewardData.rewardRate);
    
    // The actual reward rate should be close to our expected calculation
    // If exponentiation was used, it would be completely different
    expect(actualRewardRate).to.be.closeTo(expectedNewRewardRate, 10); // Allow small rounding differences
    
    // Additionally, verify that the period finish was extended correctly
    const newPeriodFinish = await instance.rewardPeriodFinish(await rewardToken.getAddress());
    expect(newPeriodFinish).to.be.greaterThan(periodFinish);
  });
});