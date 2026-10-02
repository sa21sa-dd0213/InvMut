import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m5ebf3c9e (_earned division replaced by subtraction)", function () {
  it("should compute correct earned rewards using division, not subtraction", async function () {
    const [owner, staker] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockERC20Factory.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
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
    
    // Transfer reward tokens to distributor (owner) and approve
    await rewardToken.transfer(owner.address, ethers.parseEther("10000"));
    await rewardToken.approve(await staking.getAddress(), ethers.parseEther("10000"));
    
    // Stake 100 tokens
    await staking.connect(staker).stake(ethers.parseEther("100"));
    
    // Notify reward: 1000 reward tokens over 1 week (DURATION = 604800 seconds)
    await staking.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("1000"));
    
    // Advance time by 3 days (259200 seconds) to accumulate some rewards
    await ethers.provider.send("evm_increaseTime", [259200]);
    await ethers.provider.send("evm_mine", []);
    
    // Calculate expected earned rewards manually:
    // rewardRate = 1000e18 / 604800 ≈ 1.652e15 per second
    // time elapsed = 259200 seconds
    // rewardPerToken = (259200 * 1.652e15 * 1e18) / 100e18 = 259200 * 1.652e15 = ~4.282e20
    // For 100e18 balance: earned = (100e18 * rewardPerToken) / 1e18 = 100e18 * rewardPerToken / 1e18
    // The original divides by 1e18, the mutant subtracts 1e18
    
    // Get the actual earned amount from the contract
    const earnedAmount = await staking.earned(staker.address, await rewardToken.getAddress());
    
    // The earned amount should be a reasonable positive number (not negative, not zero)
    // If the mutant subtracted 1e18 instead of dividing, the result would be:
    // (100e18 * rewardPerToken) - 1e18, which would be a huge negative number since
    // rewardPerToken is a small fraction, making the product less than 1e18
    // OR it would be completely wrong
    
    // Verify the earned amount is reasonable (between 0 and total rewards)
    expect(earnedAmount).to.be.gt(0);
    expect(earnedAmount).to.be.lt(ethers.parseEther("1000"));
    
    // Additional verification: claim rewards should succeed
    await staking.connect(staker).getRewards(staker.address);
    
    // After claiming, earned should be 0
    const earnedAfterClaim = await staking.earned(staker.address, await rewardToken.getAddress());
    expect(earnedAfterClaim).to.equal(0);
  });
});

// Helper contract for testing
contract("MockERC20", function () {
  // This is just a placeholder for the ABI; we'll deploy a standard ERC20
});