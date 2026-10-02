import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant m461fe53a", function () {
  it("should kill the mutant that replaces division with addition in _notifyReward", async function () {
    const [owner, distributor, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Stake Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a reward token
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const StakingFactory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StakingFactory.deploy(await stakingToken.getAddress(), distributor.address);
    await staking.waitForDeployment();
    
    // Add reward token and set distributor
    await staking.connect(owner).addReward(await rewardToken.getAddress());
    await staking.connect(owner).setRewardDistributor(distributor.address);
    
    // Stake tokens first so totalSupply > 0
    await stakingToken.transfer(user.address, ethers.parseEther("100"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("100"));
    await staking.connect(user).stake(ethers.parseEther("10"));
    
    // Calculate expected reward rate: original uses _amount / DURATION, mutant uses _amount + DURATION
    const DURATION = 86400 * 7; // 604800 seconds
    const rewardAmount = ethers.parseEther("1000"); // 1000 tokens
    const expectedOriginalRate = rewardAmount / BigInt(DURATION);
    const expectedMutantRate = rewardAmount + BigInt(DURATION);
    
    // Transfer reward tokens to distributor
    await rewardToken.transfer(distributor.address, rewardAmount);
    await rewardToken.connect(distributor).approve(await staking.getAddress(), rewardAmount);
    
    // Notify reward amount
    await staking.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Check the reward rate - should be _amount / DURATION in original
    // If mutant is present, it will be _amount + DURATION which is vastly different
    const rewardData = await staking.rewardData(await rewardToken.getAddress());
    
    // The rewardRate should be the original calculation (division), not the mutant (addition)
    // If mutant is present, rewardRate will be extremely large (~1000e18 + 604800)
    // If original, rewardRate will be very small (~1000e18 / 604800)
    expect(rewardData.rewardRate).to.equal(expectedOriginalRate);
    
    // Additional verification: claim rewards after some time
    // Advance time by 1 second
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);
    
    // Get reward for user
    const earnedBefore = await staking.earned(user.address, await rewardToken.getAddress());
    
    // If mutant is active, rewards would be astronomically high
    // If original, rewards should be very small (proportional to rate)
    expect(earnedBefore).to.be.lessThan(ethers.parseEther("0.01")); // Should be tiny with original
    
    // Fast forward to end of reward period
    await ethers.provider.send("evm_increaseTime", [DURATION]);
    await ethers.provider.send("evm_mine", []);
    
    const earnedAfter = await staking.earned(user.address, await rewardToken.getAddress());
    
    // With original, total earned should be close to rewardAmount * (userStake / totalSupply)
    // With mutant, it would be massively larger
    expect(earnedAfter).to.be.lessThan(rewardAmount); // Original: user gets portion of 1000 tokens
  });
});