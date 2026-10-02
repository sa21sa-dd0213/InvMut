import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant detection - _earned return statement", function () {
  it("should kill mutant m3bc2c9d9 by verifying earned rewards calculation returns correct positive value", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("ERC20Mock");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock reward token
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();
    
    // Add reward token
    await staking.addReward(await rewardToken.getAddress());
    
    // Transfer staking tokens to user and approve staking contract
    await stakingToken.transfer(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("1000"));
    
    // User stakes tokens
    await staking.connect(user).stake(ethers.parseEther("100"));
    
    // Transfer reward tokens to owner and notify reward
    await rewardToken.transfer(owner.address, ethers.parseEther("1000"));
    await rewardToken.approve(await staking.getAddress(), ethers.parseEther("1000"));
    
    // Notify reward amount (1 reward token per second for 7 days)
    const rewardAmount = ethers.parseEther("604800"); // DURATION * 1 token per second
    await staking.notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Advance time to accumulate rewards
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine", []);
    
    // Query earned rewards - this should return a positive value in the original contract
    // but will return 0 in the mutant since the return statement is removed
    const earnedAmount = await staking.earned(user.address, await rewardToken.getAddress());
    
    // The mutant will return 0 because the return statement is removed from _earned
    // The original contract will return a positive value
    expect(earnedAmount).to.be.gt(0);
  });
});