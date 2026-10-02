import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - updateReward modifier", function () {
  it("should kill mutant m9e06537f by verifying reward accrual is properly tracked for user stakes", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock reward token
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();
    
    // Transfer staking tokens to user
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.transfer(user.address, stakeAmount);
    
    // User approves staking contract
    await stakingToken.connect(user).approve(await staking.getAddress(), stakeAmount);
    
    // Owner adds reward token and sends rewards
    await staking.addReward(await rewardToken.getAddress());
    
    // Transfer reward tokens to owner for distribution
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.transfer(owner.address, rewardAmount);
    await rewardToken.approve(await staking.getAddress(), rewardAmount);
    
    // Notify reward amount (this starts the reward period)
    await staking.notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // User stakes tokens
    await staking.connect(user).stake(stakeAmount);
    
    // Fast forward time to accrue rewards (half of DURATION = 86400 * 7 / 2 = 302400 seconds)
    await ethers.provider.send("evm_increaseTime", [302400]);
    await ethers.provider.send("evm_mine", []);
    
    // Record user's earned rewards before any action that triggers updateReward
    const earnedBefore = await staking.connect(user).earned(user.address, await rewardToken.getAddress());
    
    // Perform a small withdraw to trigger the updateReward modifier with user address
    const withdrawAmount = ethers.parseEther("1");
    await staking.connect(user).withdraw(withdrawAmount, true);
    
    // Check claimable rewards - in original contract, rewards should be updated and claimable
    // In mutant, since updateReward skips user update, rewards might be incorrect
    const claimableAfter = await staking.connect(user).claimableRewards(user.address, await rewardToken.getAddress());
    
    // The mutant will fail because it doesn't update user rewards properly
    // In the original contract, after withdraw with claim=true, the user should have some rewards
    // In the mutant, the rewards update is skipped, so claimable might be 0 or incorrect
    expect(claimableAfter).to.be.gt(0);
  });
});