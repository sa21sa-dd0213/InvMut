import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant detection - DURATION exponentiation", function () {
  it("should detect mutant where DURATION uses exponentiation instead of multiplication", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("ERC20Mock");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(
      await stakingToken.getAddress(),
      owner.address
    );
    await staking.waitForDeployment();
    
    // Add reward token
    await staking.addReward(await rewardToken.getAddress());
    
    // Mint staking tokens to user and approve
    await stakingToken.mint(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("1000"));
    
    // Mint reward tokens to owner and approve
    await rewardToken.mint(owner.address, ethers.parseEther("10000"));
    await rewardToken.connect(owner).approve(await staking.getAddress(), ethers.parseEther("10000"));
    
    // User stakes tokens
    await staking.connect(user).stake(ethers.parseEther("100"));
    
    // Owner notifies a reward
    await staking.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("1000"));
    
    // Advance time by 1 day (86400 seconds)
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine");
    
    // Check earned rewards for user
    const earned = await staking.earned(user.address, await rewardToken.getAddress());
    
    // With the correct DURATION (604800), after 1 day the user should have earned:
    // (1000 * 1e18 / 604800) * 86400 * 100 / 1e18 ≈ 142.85 tokens
    // With the mutant DURATION (86400^7), the reward rate would be essentially 0
    // and the user would have earned essentially 0 tokens
    expect(earned).to.be.gt(ethers.parseEther("100"));
  });
});