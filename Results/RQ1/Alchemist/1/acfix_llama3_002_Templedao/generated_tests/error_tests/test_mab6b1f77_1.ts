import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Mutant mab6b1f77 detection", function () {
  it("should kill mutant that removes updateReward modifier from _withdrawFor", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();
    
    // Add reward token and fund reward distributor
    await staking.connect(owner).addReward(await rewardToken.getAddress());
    await rewardToken.connect(owner).transfer(owner.address, ethers.parseEther("10000"));
    await rewardToken.connect(owner).approve(await staking.getAddress(), ethers.parseEther("10000"));
    
    // Notify reward
    await staking.connect(owner).notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("10000"));
    
    // User stakes tokens
    await stakingToken.connect(owner).transfer(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("1000"));
    await staking.connect(user).stake(ethers.parseEther("1000"));
    
    // Get initial claimable rewards for user
    const initialClaimable = await staking.claimableRewards(user.address, await rewardToken.getAddress());
    
    // Fast forward time to accumulate rewards
    await ethers.provider.send("evm_increaseTime", [86400 * 8]); // 8 days
    await ethers.provider.send("evm_mine", []);
    
    // Withdraw with claimRewards=true
    const tx = await staking.connect(user).withdraw(ethers.parseEther("500"), true);
    await tx.wait();
    
    // Check claimable rewards after withdrawal - should be 0 if rewards were properly claimed
    const finalClaimable = await staking.claimableRewards(user.address, await rewardToken.getAddress());
    
    // In original contract, rewards would be claimed during withdrawal, so claimable should be 0
    // In mutant (missing updateReward), rewards might not be properly updated/claimed
    expect(finalClaimable).to.equal(0);
    
    // Also verify that the reward token balance of user increased (they received rewards)
    const userRewardBalance = await rewardToken.balanceOf(user.address);
    expect(userRewardBalance).to.be.gt(0);
    
    // Verify staking balance decreased correctly
    const finalStakingBalance = await staking.balanceOf(user.address);
    expect(finalStakingBalance).to.equal(ethers.parseEther("500"));
  });
});