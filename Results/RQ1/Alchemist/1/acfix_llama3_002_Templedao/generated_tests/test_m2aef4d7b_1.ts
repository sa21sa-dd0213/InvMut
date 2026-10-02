import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m2aef4d7b", function () {
  it("should stop reward accrual after period finish when reward period has ended", async function () {
    const [owner, distributor, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();
    
    const instanceAddress = await instance.getAddress();
    
    // Setup: Add reward token
    await instance.connect(owner).addReward(await rewardToken.getAddress());
    
    // Transfer reward tokens to distributor and approve
    await rewardToken.connect(owner).transfer(distributor.address, ethers.parseEther("1000"));
    await rewardToken.connect(distributor).approve(instanceAddress, ethers.parseEther("1000"));
    
    // User stakes tokens
    await stakingToken.connect(owner).transfer(user.address, ethers.parseEther("100"));
    await stakingToken.connect(user).approve(instanceAddress, ethers.parseEther("100"));
    await instance.connect(user).stake(ethers.parseEther("100"));
    
    // Notify reward: 100 tokens over 1 week (DURATION = 86400 * 7 = 604800 seconds)
    const rewardAmount = ethers.parseEther("100");
    await instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Get reward per token immediately after notification
    const rewardPerTokenInitial = await instance.rewardPerToken(await rewardToken.getAddress());
    
    // Fast forward past the reward period finish time
    const periodFinish = await instance.rewardPeriodFinish(await rewardToken.getAddress());
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(periodFinish) + 100]);
    await ethers.provider.send("evm_mine");
    
    // Get reward per token after period has ended
    const rewardPerTokenAfter = await instance.rewardPerToken(await rewardToken.getAddress());
    
    // The reward per token should NOT increase after the period finishes
    // Original: returns _finishTime when block.timestamp > finish, stopping accumulation
    // Mutant: always returns block.timestamp, so reward per token continues to increase
    expect(rewardPerTokenAfter).to.equal(rewardPerTokenInitial);
  });
});