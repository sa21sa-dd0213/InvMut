import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - _getReward condition", function () {
  it("should transfer rewards to staker when claiming, but mutant with false condition will not transfer", async function () {
    const [owner, staker] = await ethers.getSigners();
    
    // Deploy a mock ERC20 for staking token and reward token
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    const rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const StakingFactory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StakingFactory.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();
    
    // Add reward token
    await staking.addReward(await rewardToken.getAddress());
    
    // Transfer staking tokens to staker and approve
    await stakingToken.transfer(staker.address, ethers.parseEther("1000"));
    await stakingToken.connect(staker).approve(await staking.getAddress(), ethers.parseEther("1000"));
    
    // Staker stakes tokens
    const stakeAmount = ethers.parseEther("100");
    await staking.connect(staker).stake(stakeAmount);
    
    // Transfer reward tokens to reward distributor and notify reward
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.transfer(owner.address, rewardAmount);
    await rewardToken.approve(await staking.getAddress(), rewardAmount);
    await staking.notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Fast forward time to accumulate rewards
    const duration = 86400 * 7; // DURATION from contract
    await ethers.provider.send("evm_increaseTime", [duration]);
    await ethers.provider.send("evm_mine", []);
    
    // Get staker's reward token balance before claiming
    const balanceBefore = await rewardToken.balanceOf(staker.address);
    
    // Claim rewards
    await staking.connect(staker).getRewards(staker.address);
    
    // Get staker's reward token balance after claiming
    const balanceAfter = await rewardToken.balanceOf(staker.address);
    
    // In the original contract, rewards should be transferred, so balanceAfter > balanceBefore
    // In the mutant, the condition is always false, so no transfer happens, balanceAfter == balanceBefore
    expect(balanceAfter).to.be.gt(balanceBefore);
  });
});