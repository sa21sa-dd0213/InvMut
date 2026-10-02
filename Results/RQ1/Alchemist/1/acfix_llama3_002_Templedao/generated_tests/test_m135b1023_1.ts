import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Mutant m135b1023 test", function () {
  it("should allow withdrawal without claiming rewards when claim=false", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    
    // Deploy a mock reward token
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();
    
    // Add reward token
    await staking.addReward(await rewardToken.getAddress());
    
    // Transfer staking tokens to user and approve
    await stakingToken.transfer(user.address, ethers.parseEther("100"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("100"));
    
    // User stakes tokens
    await staking.connect(user).stake(ethers.parseEther("10"));
    
    // Fund rewards and notify
    await rewardToken.transfer(await staking.getAddress(), ethers.parseEther("1000"));
    await staking.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("1000"));
    
    // Fast forward time to accrue rewards
    await ethers.provider.send("evm_increaseTime", [86400 * 7]); // 1 week
    await ethers.provider.send("evm_mine", []);
    
    // Record rewards before withdrawal
    const rewardsBefore = await staking.earned(user.address, await rewardToken.getAddress());
    expect(rewardsBefore).to.be.gt(0);
    
    // Withdraw with claim=false
    await staking.connect(user).withdraw(ethers.parseEther("5"), false);
    
    // Check that rewards are still claimable (not cleared)
    const rewardsAfter = await staking.claimableRewards(user.address, await rewardToken.getAddress());
    
    // In the original contract, rewards should remain (claim=false)
    // In the mutant, rewards would be cleared (claim=true always)
    // The mutant kills if rewardsAfter > 0 (original behavior preserved)
    expect(rewardsAfter).to.be.gt(0);
  });
});