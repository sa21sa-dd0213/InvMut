import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant md81f549c", function () {
  it("should return non-zero earned rewards after staking and notifying rewards", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a reward token
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();
    
    // Transfer staking tokens to user and approve
    await stakingToken.transfer(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("1000"));
    
    // Add reward token
    await staking.addReward(await rewardToken.getAddress());
    
    // Fund reward distributor and notify reward
    await rewardToken.transfer(owner.address, ethers.parseEther("1000"));
    await rewardToken.approve(await staking.getAddress(), ethers.parseEther("1000"));
    await staking.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("1000"));
    
    // User stakes tokens
    await staking.connect(user).stake(ethers.parseEther("100"));
    
    // Advance time past the reward period to accumulate rewards
    await ethers.provider.send("evm_increaseTime", [604800]); // 7 days = DURATION
    await ethers.provider.send("evm_mine", []);
    
    // Call earned() - should return non-zero for the mutant-killing assertion
    const earnedAmount = await staking.connect(user).earned(user.address, await rewardToken.getAddress());
    
    // The mutant returns 0, so expect > 0 kills it
    expect(earnedAmount).to.be.gt(0);
  });
});