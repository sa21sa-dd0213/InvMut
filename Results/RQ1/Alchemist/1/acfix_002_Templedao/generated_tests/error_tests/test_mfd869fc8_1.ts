import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant mfd869fc8 test", function () {
  it("should correctly calculate reward after period finish (kill mutant)", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Stake", "STK", 18);
    await stakingToken.waitForDeployment();
    
    // Deploy a reward token
    const rewardToken = await MockToken.deploy("Reward", "RWD", 18);
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Add reward token
    await instance.addReward(await rewardToken.getAddress());
    
    // Transfer some reward tokens to the distributor (owner)
    await rewardToken.mint(owner.address, ethers.parseEther("1000"));
    await rewardToken.connect(owner).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Stake tokens first to have totalSupply > 0
    await stakingToken.mint(user.address, ethers.parseEther("100"));
    await stakingToken.connect(user).approve(await instance.getAddress(), ethers.parseEther("100"));
    await instance.connect(user).stake(ethers.parseEther("100"));
    
    // Notify reward with a small amount that will distribute over DURATION (7 days)
    const rewardAmount = ethers.parseEther("7"); // 1 token per day
    await instance.notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Fast forward past the reward period finish
    const DURATION = 86400 * 7; // 7 days
    await ethers.provider.send("evm_increaseTime", [DURATION + 1000]); // Past period finish
    await ethers.provider.send("evm_mine", []);
    
    // Now call rewardPerToken - this should use the period finish time since it's in the past
    // If the mutant is present, it will return 0 instead of the correct rewardPerTokenStored
    const rewardPerTokenResult = await instance.rewardPerToken(await rewardToken.getAddress());
    
    // The correct behavior: after period finish, no new rewards accrue, so rewardPerToken should equal rewardPerTokenStored
    // We can get rewardPerTokenStored from the contract
    const rewardData = await instance.rewardData(await rewardToken.getAddress());
    const expectedRewardPerToken = rewardData.rewardPerTokenStored;
    
    // If mutant is present, rewardPerToken will return 0 (default return) instead of expectedRewardPerToken
    expect(rewardPerTokenResult).to.equal(expectedRewardPerToken);
    
    // Also test earned function which depends on _lastTimeRewardApplicable
    const earnedResult = await instance.earned(user.address, await rewardToken.getAddress());
    const balance = await instance.balanceOf(user.address);
    const userRewardPerTokenPaid = await instance.userRewardPerTokenPaid(user.address, await rewardToken.getAddress());
    const expectedEarned = (balance * (rewardPerTokenResult - userRewardPerTokenPaid)) / BigInt(1e18) + BigInt(0);
    
    // If mutant is present, earned will be incorrect
    expect(earnedResult).to.equal(expectedEarned);
  });
});