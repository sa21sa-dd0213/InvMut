import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Mutant mf8007ad3 test", function () {
  it("should kill mutant that replaces block.timestamp with block.prevrandao in _notifyReward", async function () {
    const [owner, distributor, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), distributor.address);
    await staking.waitForDeployment();
    
    // Setup: Add reward token and set distributor
    await staking.connect(owner).addReward(await rewardToken.getAddress());
    await staking.connect(owner).setRewardDistributor(distributor.address);
    
    // Transfer reward tokens to distributor
    await rewardToken.connect(owner).transfer(distributor.address, ethers.parseEther("10000"));
    await rewardToken.connect(distributor).approve(await staking.getAddress(), ethers.parseEther("10000"));
    
    // First notification - sets initial reward rate
    const rewardAmount1 = ethers.parseEther("1000");
    const duration = 86400 * 7; // 7 days in seconds
    
    await rewardToken.connect(distributor).approve(await staking.getAddress(), rewardAmount1);
    const tx1 = await staking.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount1);
    await tx1.wait();
    
    // Get the period finish after first notification
    const periodFinish1 = await staking.rewardPeriodFinish(await rewardToken.getAddress());
    
    // Fast forward 3 days (less than 7 days) to create leftover scenario
    await ethers.provider.send("evm_increaseTime", [3 * 86400]);
    await ethers.provider.send("evm_mine");
    
    // Second notification - this is where the mutant bug manifests
    // Original: remaining = periodFinish - block.timestamp (time-based)
    // Mutant: remaining = periodFinish - block.prevrandao (random value)
    const rewardAmount2 = ethers.parseEther("500");
    await rewardToken.connect(distributor).approve(await staking.getAddress(), rewardAmount2);
    const tx2 = await staking.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount2);
    await tx2.wait();
    
    // Calculate expected reward rate for original contract
    // After first notification: rewardRate = 1000 / 604800 = ~0.001652 ethers per second
    // After 3 days (259200 seconds), remaining = 604800 - 259200 = 345600 seconds
    // leftover = 345600 * 0.001652 = ~571.43 ethers
    // New rewardRate = (500 + 571.43) / 604800 = ~0.001771 ethers per second
    
    const rewardData = await staking.rewardData(await rewardToken.getAddress());
    const actualRate = rewardData.rewardRate;
    
    // The reward rate should be a reasonable value based on time calculation
    // If mutant was applied, block.prevrandao would give a completely different value
    // prevrandao is typically a large number like 0x... so remaining would be negative (underflow)
    // or an extremely large value, resulting in a nonsensical reward rate
    
    // Verify the reward rate is within expected bounds (not extremely large or zero from underflow)
    expect(actualRate).to.be.gt(0);
    expect(actualRate).to.be.lt(ethers.parseEther("1")); // Should be reasonable for the amounts used
    
    // Now let's actually verify by staking and checking earned rewards
    // Transfer staking tokens to user
    await stakingToken.connect(owner).transfer(user.address, ethers.parseEther("100"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("100"));
    
    // User stakes
    await staking.connect(user).stake(ethers.parseEther("100"));
    
    // Fast forward some time to accumulate rewards
    await ethers.provider.send("evm_increaseTime", [2 * 86400]); // 2 more days
    await ethers.provider.send("evm_mine");
    
    // Check earned rewards
    const earnedRewards = await staking.earned(user.address, await rewardToken.getAddress());
    
    // With the original contract, this should be a reasonable positive value
    // With the mutant, it could be extremely large or zero due to incorrect rate calculation
    expect(earnedRewards).to.be.gt(0);
    expect(earnedRewards).to.be.lt(ethers.parseEther("1000")); // Reasonable upper bound
    
    // Additional verification: check that reward rate is consistent with time-based calculation
    // The reward rate should be roughly proportional to the reward amounts and time periods
    // This would fail with mutant because prevrandao is not time-based
    const expectedMinRate = ethers.parseEther("0.001"); // Minimum reasonable rate
    expect(actualRate).to.be.gte(expectedMinRate);
  });
});