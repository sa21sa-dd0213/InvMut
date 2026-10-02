import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Mutant m1b192b9c detection test", function () {
  it("should kill the mutant by checking reward calculation after reward period ends", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK");
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await ERC20Factory.deploy("Reward Token", "RWD");
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Add reward token
    await instance.addReward(await rewardToken.getAddress());
    
    // Mint staking tokens to user and approve
    await stakingToken.mint(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Mint reward tokens to owner and approve
    await rewardToken.mint(owner.address, ethers.parseEther("1000"));
    await rewardToken.connect(owner).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Stake tokens
    await instance.connect(user).stake(ethers.parseEther("100"));
    
    // Notify reward amount (reward period = 7 days)
    const rewardAmount = ethers.parseEther("100");
    await instance.notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Get the periodFinish timestamp
    const periodFinish = await instance.rewardPeriodFinish(await rewardToken.getAddress());
    
    // Fast forward time past the reward period end
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(periodFinish) + 100]);
    await ethers.provider.send("evm_mine");
    
    // Check earned rewards - after period ends, reward rate * duration should equal total rewards
    // The original calculates rewards using periodFinish as last applicable time
    // The mutant uses block.timestamp which would give a different result
    const earnedRewards = await instance.connect(user).earned(user.address, await rewardToken.getAddress());
    
    // Expected reward: (100 tokens * 1e18 * DURATION) / totalSupply * balance / 1e18
    // Since user has all 100 staked tokens out of 100 total supply, they should get all 100 tokens
    // But the mutant would calculate additional rewards because it uses block.timestamp > periodFinish
    // In the original: lastApplicable = periodFinish, so rewards = periodFinish - lastUpdateTime = DURATION
    // In the mutant: lastApplicable = block.timestamp, so rewards = block.timestamp - lastUpdateTime > DURATION
    // This means the mutant would show MORE rewards than actually distributed
    
    // Claim rewards to verify the actual transfer amount
    await instance.connect(user).getRewards(user.address);
    
    const rewardBalance = await rewardToken.balanceOf(user.address);
    
    // The actual reward balance should equal the expected reward amount
    // The mutant would have transferred MORE tokens than available (or cause overflow)
    // This assertion will fail on the mutant because it calculated incorrect rewards
    expect(rewardBalance).to.equal(rewardAmount);
    
    // Additional verification: check that no extra rewards were minted/claimed
    const ownerRewardBalance = await rewardToken.balanceOf(owner.address);
    expect(ownerRewardBalance).to.equal(ethers.parseEther("900")); // 1000 minted - 100 distributed
  });
});