import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Mutant mf9e1accd detection test", function () {
  it("should detect missing updateReward modifier in getRewards function", async function () {
    const [owner, staker] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy another ERC20 token for rewards
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Add reward token to the staking contract
    await instance.addReward(await rewardToken.getAddress());
    
    // Transfer staking tokens to staker
    await stakingToken.transfer(staker.address, ethers.parseEther("1000"));
    
    // Staker stakes tokens
    await stakingToken.connect(staker).approve(await instance.getAddress(), ethers.parseEther("1000"));
    await instance.connect(staker).stake(ethers.parseEther("1000"));
    
    // Owner sends reward tokens to the staking contract and notifies reward
    await rewardToken.transfer(await instance.getAddress(), ethers.parseEther("1000"));
    await instance.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("1000"));
    
    // Fast forward time to accumulate rewards
    await ethers.provider.send("evm_increaseTime", [86400 * 4]); // 4 days
    await ethers.provider.send("evm_mine", []);
    
    // Record staker's reward token balance before claiming
    const balanceBefore = await rewardToken.balanceOf(staker.address);
    
    // Call getRewards - in the original contract, this would update rewards and transfer them
    // In the mutant (missing updateReward modifier), the rewards won't be properly updated
    await instance.connect(staker).getRewards(staker.address);
    
    // Record staker's reward token balance after claiming
    const balanceAfter = await rewardToken.balanceOf(staker.address);
    const rewardClaimed = balanceAfter - balanceBefore;
    
    // If the mutant is present (missing updateReward), the staker will receive 0 rewards
    // because claimableRewards was never updated with the accrued rewards
    // The original contract would have updated claimableRewards and transferred the correct amount
    expect(rewardClaimed).to.be.gt(0);
  });
});