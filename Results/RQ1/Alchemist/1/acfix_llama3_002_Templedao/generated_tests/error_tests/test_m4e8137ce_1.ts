import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant detection - rewardPerToken return value", function () {
  it("should kill mutant m4e8137ce by verifying rewardPerToken returns correct non-zero value", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy another token for rewards
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking with required constructor args
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const instance = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Add reward token
    await instance.addReward(await rewardToken.getAddress());
    
    // Transfer staking tokens to user and approve contract
    await stakingToken.transfer(user.address, ethers.parseEther("100"));
    await stakingToken.connect(user).approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // User stakes tokens
    await instance.connect(user).stake(ethers.parseEther("100"));
    
    // Fund rewards and notify
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.transfer(owner.address, rewardAmount);
    await rewardToken.approve(await instance.getAddress(), rewardAmount);
    await instance.notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Advance time to allow rewards to accrue
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine");
    
    // Call rewardPerToken - should return non-zero value
    const rewardPerTokenValue = await instance.rewardPerToken(await rewardToken.getAddress());
    
    // Assert that rewardPerToken returns a non-zero value
    // The mutant returns 0, so this assertion will fail on the mutant and pass on original
    expect(rewardPerTokenValue).to.be.gt(0);
  });
});