import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant test - _lastTimeRewardApplicable", function () {
  it("should detect mutant that replaces block.timestamp with block.prevrandao in _lastTimeRewardApplicable", async function () {
    const [owner, staker] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock reward token
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();
    
    // Add reward token and fund the contract with rewards
    await staking.addReward(await rewardToken.getAddress());
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.transfer(owner.address, rewardAmount);
    await rewardToken.approve(await staking.getAddress(), rewardAmount);
    
    // Transfer staking tokens to staker
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.transfer(staker.address, stakeAmount);
    await stakingToken.connect(staker).approve(await staking.getAddress(), stakeAmount);
    
    // Stake tokens
    await staking.connect(staker).stake(stakeAmount);
    
    // Notify reward (this sets up the reward period)
    await staking.notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Get the reward period finish time
    const periodFinish = await staking.rewardPeriodFinish(await rewardToken.getAddress());
    
    // Advance time to a point within the reward period (e.g., half way)
    const halfDuration = 86400 * 7 / 2; // Half of DURATION
    await ethers.provider.send("evm_increaseTime", [halfDuration]);
    await ethers.provider.send("evm_mine", []);
    
    // Now check the earned rewards - the original uses block.timestamp, mutant uses block.prevrandao
    // In the original, rewards will accrue correctly based on time elapsed
    // In the mutant, block.prevrandao will give a wrong value leading to incorrect rewards
    const earned = await staking.earned(staker.address, await rewardToken.getAddress());
    
    // Calculate expected reward: (stakeAmount * rewardRate * timeElapsed * 1e18) / totalSupply / 1e18
    // rewardRate = rewardAmount / DURATION = 1000 / 604800
    // timeElapsed = halfDuration = 302400
    // Expected = (100 * (1000/604800) * 302400 * 1e18) / 100 / 1e18 = 500
    const expectedReward = ethers.parseEther("500");
    
    // The mutant will return a different value because block.prevrandao != block.timestamp
    // We expect the original to return the correct value
    // Note: We're checking that the earned amount is close to expected (within small tolerance)
    // The mutant would give a completely different (likely 0 or very different) value
    expect(earned).to.be.closeTo(expectedReward, ethers.parseEther("1"));
    
    // Additional verification: claim rewards and verify they match
    await staking.connect(staker).getRewards(staker.address);
    const rewardBalance = await rewardToken.balanceOf(staker.address);
    expect(rewardBalance).to.be.closeTo(expectedReward, ethers.parseEther("1"));
  });
});