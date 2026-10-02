import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant m2f59ccd4", function () {
  it("should kill the mutant by verifying correct rewardPerToken calculation with non-zero total supply", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Add reward token
    await instance.addReward(await rewardToken.getAddress());
    
    // Fund user with staking tokens
    await stakingToken.transfer(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // User stakes tokens
    await instance.connect(user).stake(ethers.parseEther("100"));
    
    // Fund rewards to the staking contract
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.transfer(owner.address, rewardAmount);
    await rewardToken.connect(owner).approve(await instance.getAddress(), rewardAmount);
    
    // Notify reward amount (this sets rewardRate = rewardAmount / DURATION)
    await instance.connect(owner).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Fast forward time by half the duration
    const DURATION = 86400 * 7; // 7 days
    await ethers.provider.send("evm_increaseTime", [DURATION / 2]);
    await ethers.provider.send("evm_mine", []);
    
    // Get the reward per token
    const rewardPerToken = await instance.rewardPerToken(await rewardToken.getAddress());
    
    // Calculate expected reward per token manually:
    // rewardPerTokenStored starts at 0
    // lastUpdateTime was set at notification time
    // periodFinish = notification time + DURATION
    // After half duration, time elapsed = DURATION/2
    // rewardRate = rewardAmount / DURATION
    // Expected = 0 + ((DURATION/2) * (rewardAmount/DURATION) * 1e18) / totalSupply(100e18)
    // = (DURATION/2 * rewardAmount/DURATION * 1e18) / 100e18
    // = (rewardAmount/2 * 1e18) / 100e18
    // = (500e18 * 1e18) / 100e18
    // = 5e18
    
    const expectedRewardPerToken = ethers.parseEther("5");
    
    // The mutant would compute: lastUpdateTime ** rewardRate * 1e18 / totalSupply
    // which would be an astronomically different number
    // So the assertion should fail on the mutant
    expect(rewardPerToken).to.equal(expectedRewardPerToken);
  });
});