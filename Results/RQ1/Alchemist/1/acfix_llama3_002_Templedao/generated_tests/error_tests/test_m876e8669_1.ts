import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant m876e8669", function () {
  it("should include leftover rewards when notifying new rewards during an active period", async function () {
    const [owner, distributor, staker] = await ethers.getSigners();
    
    // Deploy a mock ERC20 for staking token and reward token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking", "STK", ethers.parseEther("1000000"));
    const rewardToken = await MockERC20.deploy("Reward", "RWD", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();
    
    // Setup: add reward token and set reward distributor
    await instance.connect(owner).addReward(await rewardToken.getAddress());
    await instance.connect(owner).setRewardDistributor(distributor.address);
    
    // Transfer reward tokens to distributor for funding
    await rewardToken.transfer(distributor.address, ethers.parseEther("1000"));
    
    // Stake tokens first
    await stakingToken.transfer(staker.address, ethers.parseEther("100"));
    await stakingToken.connect(staker).approve(await instance.getAddress(), ethers.parseEther("100"));
    await instance.connect(staker).stake(ethers.parseEther("100"));
    
    // First reward notification - 100 tokens over 7 days
    const DURATION = 86400 * 7; // 7 days in seconds
    const firstReward = ethers.parseEther("100");
    await rewardToken.connect(distributor).approve(await instance.getAddress(), firstReward);
    await instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), firstReward);
    
    // Wait 3 days (halfway through the period)
    await ethers.provider.send("evm_increaseTime", [3 * 86400]);
    await ethers.provider.send("evm_mine");
    
    // Second reward notification - 50 more tokens while period is still active
    const secondReward = ethers.parseEther("50");
    await rewardToken.connect(distributor).approve(await instance.getAddress(), secondReward);
    
    // This should include leftover from first period (4 days remaining * rewardRate)
    // Original: rewardRate = (50 + leftover) / DURATION
    // Mutant: rewardRate = 50 / DURATION (ignores leftover)
    await instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), secondReward);
    
    // Fast forward to end of period
    await ethers.provider.send("evm_increaseTime", [7 * 86400]);
    await ethers.provider.send("evm_mine");
    
    // Check earned rewards - should be higher in original due to leftover inclusion
    const earned = await instance.earned(staker.address, await rewardToken.getAddress());
    
    // If mutant is active, earned will be lower because leftover was discarded
    // In original: total rewards = 100 + 50 = 150 tokens for the full period (adjusted for timing)
    // In mutant: only 50 tokens counted from second notification, first 100 partially distributed
    // The mutant would have distributed ~3/7 of first 100 + all of 50 = ~42.86 + 50 = ~92.86 tokens
    // Original would have distributed all 150 tokens (with proper rate calculation)
    expect(earned).to.be.closeTo(ethers.parseEther("150"), ethers.parseEther("1"));
    
    // Alternative: check that rewards are at least what the mutant would produce
    // This ensures the mutant is killed because it would produce a lower value
    expect(earned).to.be.gt(ethers.parseEther("100"));
  });
});

// Mock ERC20 contract for testing
// Note: This contract should be deployed as part of the test setup
// The actual deployment would need a separate contract file