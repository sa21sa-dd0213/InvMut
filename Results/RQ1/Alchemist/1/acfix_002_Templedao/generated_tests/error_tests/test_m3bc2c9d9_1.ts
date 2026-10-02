import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant detection - _earned return removed", function () {
  it("should detect that _earned returns 0 instead of actual earned rewards after staking and reward distribution", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();
    
    // Add reward token
    await staking.addReward(await rewardToken.getAddress());
    
    // Transfer staking tokens to user
    const stakeAmount = ethers.parseEther("1000");
    await stakingToken.transfer(user.address, stakeAmount);
    
    // User stakes tokens
    await stakingToken.connect(user).approve(await staking.getAddress(), stakeAmount);
    await staking.connect(user).stake(stakeAmount);
    
    // Fund reward distributor with reward tokens
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.transfer(owner.address, rewardAmount);
    await rewardToken.connect(owner).approve(await staking.getAddress(), rewardAmount);
    
    // Notify reward amount
    await staking.connect(owner).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Fast forward time to accumulate rewards
    await ethers.provider.send("evm_increaseTime", [86400 * 7]); // 1 week
    await ethers.provider.send("evm_mine", []);
    
    // Check earned rewards - should be > 0 after staking and reward distribution
    const earned = await staking.earned(user.address, await rewardToken.getAddress());
    
    // In the mutant, _earned returns 0, so this should fail
    expect(earned).to.be.gt(0);
  });
});