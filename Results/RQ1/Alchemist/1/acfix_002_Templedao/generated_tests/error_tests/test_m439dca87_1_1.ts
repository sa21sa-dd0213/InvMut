import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m439dca87 (>= vs > in _notifyReward)", function () {
  it("should kill mutant when notifying reward exactly at period finish time", async function () {
    const [owner, distributor, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();
    
    // Add reward token
    await instance.connect(owner).addReward(await rewardToken.getAddress());
    
    // Fund distributor with reward tokens
    await rewardToken.connect(owner).transfer(distributor.address, ethers.parseEther("1000"));
    await rewardToken.connect(distributor).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // First reward notification - start a reward period
    const DURATION = 86400 * 7; // 7 days
    const firstRewardAmount = ethers.parseEther("100");
    await instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), firstRewardAmount);
    
    // Get the period finish time
    const periodFinish = await instance.rewardPeriodFinish(await rewardToken.getAddress());
    
    // Fast forward to exactly the period finish time
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(periodFinish)]);
    
    // Now notify a new reward exactly at period finish
    // In original: block.timestamp >= periodFinish -> resets reward rate (no leftover)
    // In mutant: block.timestamp > periodFinish -> false, so leftover is calculated incorrectly
    const secondRewardAmount = ethers.parseEther("200");
    
    // Get the expected reward rate from original behavior
    const expectedRate = secondRewardAmount / BigInt(DURATION);
    
    // Notify reward
    await instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), secondRewardAmount);
    
    // Stake some tokens to be able to check reward accrual
    await stakingToken.connect(owner).transfer(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await instance.getAddress(), ethers.parseEther("1000"));
    await instance.connect(user).stake(ethers.parseEther("1000"));
    
    // Fast forward 1 second to accrue some rewards
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);
    
    // Check earned rewards
    const earned = await instance.earned(user.address, await rewardToken.getAddress());
    
    // In original: rate = 200e18 / 604800 (no leftover)
    // In mutant: leftover from previous period is added incorrectly
    // The mutant would have a different reward rate, resulting in different earned amount
    const expectedEarned = (ethers.parseEther("1000") * expectedRate * BigInt(1)) / BigInt(1e18);
    
    // If the mutant is alive, earned will be different from expectedEarned
    // If the mutant is killed, earned should match expectedEarned
    expect(earned).to.equal(expectedEarned);
  });
});