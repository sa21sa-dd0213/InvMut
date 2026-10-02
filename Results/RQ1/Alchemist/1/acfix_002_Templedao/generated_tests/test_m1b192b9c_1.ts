import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant test - _lastTimeRewardApplicable", function () {
  it("should detect mutant that inverts time comparison in _lastTimeRewardApplicable", async function () {
    const [owner, distributor, staker] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("ERC20Mock");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a reward token
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();
    
    // Add reward token
    await instance.addReward(await rewardToken.getAddress());
    
    // Stake tokens for staker
    await stakingToken.transfer(staker.address, ethers.parseEther("1000"));
    await stakingToken.connect(staker).approve(await instance.getAddress(), ethers.parseEther("1000"));
    await instance.connect(staker).stake(ethers.parseEther("100"));
    
    // Distribute rewards - set a reward rate by notifying reward amount
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.transfer(distributor.address, rewardAmount);
    await rewardToken.connect(distributor).approve(await instance.getAddress(), rewardAmount);
    await instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Get the period finish timestamp
    const periodFinish = await instance.rewardPeriodFinish(await rewardToken.getAddress());
    
    // Wait for the reward period to end
    const currentBlock = await ethers.provider.getBlock("latest");
    const timeToAdvance = Number(periodFinish) - Number(currentBlock!.timestamp) + 1;
    await ethers.provider.send("evm_increaseTime", [timeToAdvance]);
    await ethers.provider.send("evm_mine", []);
    
    // Record rewardPerToken after period has ended
    const rewardPerTokenAfterPeriod = await instance.rewardPerToken(await rewardToken.getAddress());
    
    // Advance time further (e.g., 1 day more)
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);
    
    // Check rewardPerToken again - it should NOT have increased if the period has ended
    const rewardPerTokenAfterMoreTime = await instance.rewardPerToken(await rewardToken.getAddress());
    
    // In the original contract, rewardPerToken should remain constant after period ends
    // In the mutant (with inverted comparison), it would incorrectly continue accumulating rewards
    expect(rewardPerTokenAfterMoreTime).to.equal(rewardPerTokenAfterPeriod);
  });
});