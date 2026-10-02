import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant test - _lastTimeRewardApplicable", function () {
  it("should kill mutant m94326f5d by verifying reward accrual stops after period finish", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Add reward token
    await instance.addReward(await rewardToken.getAddress());
    
    // Transfer staking tokens to user and approve
    await stakingToken.transfer(user.address, ethers.parseEther("100"));
    await stakingToken.connect(user).approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // User stakes tokens
    await instance.connect(user).stake(ethers.parseEther("10"));
    
    // Owner approves and notifies reward
    await rewardToken.transfer(owner.address, ethers.parseEther("1000"));
    await rewardToken.approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    const DURATION = 86400 * 7; // 1 week
    const rewardAmount = ethers.parseEther("700");
    
    await instance.notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Record reward per token right after notification
    const rewardPerTokenAfterNotify = await instance.rewardPerToken(await rewardToken.getAddress());
    
    // Fast forward time past the reward period finish
    const periodFinish = await instance.rewardPeriodFinish(await rewardToken.getAddress());
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(periodFinish) + 100]);
    await ethers.provider.send("evm_mine", []);
    
    // Record reward per token after period should have finished
    const rewardPerTokenAfterPeriod = await instance.rewardPerToken(await rewardToken.getAddress());
    
    // In the original contract, reward accrual should stop after period finish
    // In the mutant using block.prevrandao, it may continue accruing
    // We verify that reward per token does not increase after period finish
    expect(rewardPerTokenAfterPeriod).to.equal(rewardPerTokenAfterNotify);
    
    // Additional verification: user's earned rewards should not increase after period finish
    const earnedBefore = await instance.earned(user.address, await rewardToken.getAddress());
    
    // Mine another block to simulate time passing
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(periodFinish) + 200]);
    await ethers.provider.send("evm_mine", []);
    
    const earnedAfter = await instance.earned(user.address, await rewardToken.getAddress());
    
    // Earned rewards should remain the same after period finish
    expect(earnedAfter).to.equal(earnedBefore);
  });
});