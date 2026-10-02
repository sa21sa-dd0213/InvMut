import { expect } from "chai";
import { ethers } } from "hardhat";

describe("StaxLPStaking - kill mutant m135b1023", function () {
  it("should not claim rewards when withdrawing with claim=false", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();
    
    // Setup reward token
    await staking.addReward(await rewardToken.getAddress());
    
    // Transfer tokens to user and approve
    await stakingToken.transfer(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("1000"));
    
    // User stakes tokens
    await staking.connect(user).stake(ethers.parseEther("100"));
    
    // Fund the contract with rewards via notifyRewardAmount
    await rewardToken.transfer(owner.address, ethers.parseEther("1000"));
    await rewardToken.approve(await staking.getAddress(), ethers.parseEther("1000"));
    await staking.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("1000"));
    
    // Fast forward time to accumulate rewards
    await ethers.provider.send("evm_increaseTime", [86400 * 7]); // One week
    await ethers.provider.send("evm_mine", []);
    
    // Record user's reward balance before withdrawal
    const rewardBalanceBefore = await rewardToken.balanceOf(user.address);
    const claimableBefore = await staking.claimableRewards(user.address, await rewardToken.getAddress());
    
    // Withdraw with claim=false
    await staking.connect(user).withdraw(ethers.parseEther("100"), false);
    
    // Check that rewards were NOT claimed
    const rewardBalanceAfter = await rewardToken.balanceOf(user.address);
    const claimableAfter = await staking.claimableRewards(user.address, await rewardToken.getAddress());
    
    // Rewards should remain unclaimed (balance unchanged)
    expect(rewardBalanceAfter).to.equal(rewardBalanceBefore);
    // Claimable rewards should still be present
    expect(claimableAfter).to.equal(claimableBefore);
  });
});