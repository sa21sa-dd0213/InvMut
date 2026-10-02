import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m4e6330d4 (_lastTimeRewardApplicable uses block.prevrandao)", function () {
  it("should revert or return incorrect reward when time passes and block.prevrandao is used instead of block.timestamp", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking and rewards
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking with required constructor arguments
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();

    // Add reward token
    await staking.connect(owner).addReward(await rewardToken.getAddress());
    
    // Transfer staking tokens to user and approve
    await stakingToken.connect(owner).transfer(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("1000"));
    
    // Transfer reward tokens to owner for funding rewards
    await rewardToken.connect(owner).approve(await staking.getAddress(), ethers.parseEther("1000"));
    
    // Stake tokens
    await staking.connect(user).stake(ethers.parseEther("100"));
    
    // Notify reward (simulate distributor adding rewards)
    await staking.connect(owner).notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("700")); // 700 tokens over 7 days = 100 per day
    
    // Fast forward 1 day (86400 seconds) to accrue rewards
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);
    
    // Get the reward per token after time has passed
    const rewardPerToken = await staking.rewardPerToken(await rewardToken.getAddress());
    
    // In the original contract, after 1 day, rewardPerToken should be > 0 because time passed
    // In the mutant using block.prevrandao (a fixed value), rewardPerToken will be 0 or incorrect
    // If the mutant is deployed, this assertion will fail because block.prevrandao doesn't advance with time
    expect(rewardPerToken).to.be.gt(0, "Reward per token should have increased after time passed");
    
    // Also check earned rewards for the user
    const earned = await staking.earned(user.address, await rewardToken.getAddress());
    expect(earned).to.be.gt(0, "User should have earned rewards after time passed");
  });
});