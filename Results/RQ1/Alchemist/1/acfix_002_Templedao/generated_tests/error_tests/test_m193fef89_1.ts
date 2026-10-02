import { expect } from "chai";
import { ethers } } from "hardhat";

describe("StaxLPStaking - Mutant m193fef89 (claimRewards replaced with false)", function () {
  let stakingToken: any;
  let rewardToken: any;
  let staking: any;
  let owner: any;
  let user: any;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const StaxLPStakingFactory = await ethers.getContractFactory("StaxLPStaking");
    staking = await StaxLPStakingFactory.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();

    // Transfer staking tokens to user
    await stakingToken.transfer(user.address, ethers.parseEther("1000"));
    
    // Transfer reward tokens to owner for distribution
    await rewardToken.transfer(owner.address, ethers.parseEther("10000"));
    
    // Add reward token to staking contract
    await staking.addReward(await rewardToken.getAddress());
    
    // Approve staking contract to spend tokens
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("1000"));
    await rewardToken.approve(await staking.getAddress(), ethers.parseEther("10000"));
  });

  it("should claim rewards when withdraw is called with claim=true, but mutant will skip reward claiming", async function () {
    // User stakes tokens
    const stakeAmount = ethers.parseEther("100");
    await staking.connect(user).stake(stakeAmount);
    
    // Owner notifies reward (distributor is owner by default)
    const rewardAmount = ethers.parseEther("1000");
    await staking.notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Advance time to accumulate rewards (past the reward period finish)
    await ethers.provider.send("evm_increaseTime", [86400 * 8]); // 8 days
    await ethers.provider.send("evm_mine", []);
    
    // Check initial reward balance of user
    const initialRewardBalance = await rewardToken.balanceOf(user.address);
    
    // User withdraws with claim=true
    const withdrawAmount = ethers.parseEther("50");
    await staking.connect(user).withdraw(withdrawAmount, true);
    
    // Check final reward balance - in original contract rewards would be transferred,
    // but in mutant (claimRewards replaced with false) rewards will NOT be transferred
    const finalRewardBalance = await rewardToken.balanceOf(user.address);
    
    // In original contract: finalRewardBalance > initialRewardBalance (rewards were claimed)
    // In mutant: finalRewardBalance == initialRewardBalance (rewards NOT claimed)
    // This test will detect the mutant because the rewards should have been claimed
    expect(finalRewardBalance).to.be.gt(initialRewardBalance);
  });
});