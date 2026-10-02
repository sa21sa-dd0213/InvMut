import { expect } from "chai";
import { ethers } } from "hardhat";

describe("StaxLPStaking mutant detection - reward calculation exponentiation", function () {
  it("should kill mutant m2f59ccd4 by verifying rewards are within expected range after staking", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking with staking token and owner as distributor
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Add reward token
    await instance.addReward(await rewardToken.getAddress());
    
    // Fund user with staking tokens and approve
    await stakingToken.transfer(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // User stakes 100 tokens
    await instance.connect(user).stake(ethers.parseEther("100"));
    
    // Owner notifies reward: 1000 reward tokens over 7 days (DURATION = 604800)
    await rewardToken.approve(await instance.getAddress(), ethers.parseEther("1000"));
    await instance.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("1000"));
    
    // Fast forward 3 days (259200 seconds)
    await ethers.provider.send("evm_increaseTime", [259200]);
    await ethers.provider.send("evm_mine");
    
    // Calculate expected reward: 
    // rewardRate = 1000 / 604800 ≈ 0.001652... tokens per second
    // Time elapsed = 259200 seconds
    // User stake = 100 tokens, totalSupply = 100 tokens (only user staked)
    // Expected reward ≈ (259200 * 0.001652 * 1e18 * 100) / (1e18 * 100) ≈ 428.57 tokens
    
    // The mutant uses exponentiation instead of multiplication, producing astronomically large values
    // Get earned rewards for user
    const earned = await instance.earned(user.address, await rewardToken.getAddress());
    
    // Expected reward should be approximately 428.57 tokens (between 400 and 450)
    // Mutant would produce values far exceeding 1e18 (exponential explosion)
    expect(earned).to.be.gt(ethers.parseEther("400"));
    expect(earned).to.be.lt(ethers.parseEther("450"));
  });
});