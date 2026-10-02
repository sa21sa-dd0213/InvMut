import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - rewardPerToken return value", function () {
  it("should detect mutant by verifying rewardPerToken returns expected positive value after rewards are added", async function () {
    const [owner, staker] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock reward token
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();
    
    // Add reward token
    await staking.connect(owner).addReward(await rewardToken.getAddress());
    
    // Transfer staking tokens to staker and approve
    await stakingToken.transfer(staker.address, ethers.parseEther("1000"));
    await stakingToken.connect(staker).approve(await staking.getAddress(), ethers.parseEther("1000"));
    
    // Staker stakes tokens
    await staking.connect(staker).stake(ethers.parseEther("500"));
    
    // Transfer reward tokens to owner and approve
    await rewardToken.transfer(owner.address, ethers.parseEther("1000"));
    await rewardToken.connect(owner).approve(await staking.getAddress(), ethers.parseEther("1000"));
    
    // Notify reward amount
    await staking.connect(owner).notifyRewardAmount(
      await rewardToken.getAddress(),
      ethers.parseEther("700") // 700 tokens over 7 days = 100 tokens per day
    );
    
    // Fast forward time to accumulate some rewards (e.g., 1 day)
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);
    
    // Call rewardPerToken - this should return a positive value > 0
    const rewardPerTokenValue = await staking.rewardPerToken(await rewardToken.getAddress());
    
    // The mutant returns 0 (no return statement), original returns > 0
    expect(rewardPerTokenValue).to.be.gt(0);
  });
});