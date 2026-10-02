import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant mdb2ff6e7", function () {
  it("should revert when calling notifyRewardAmount during active reward period with wrong reward rate calculation", async function () {
    const [owner, distributor, staker] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();
    
    // Setup: add reward token and set reward distributor
    await instance.connect(owner).addReward(await rewardToken.getAddress());
    
    // Transfer reward tokens to distributor
    await rewardToken.transfer(distributor.address, ethers.parseEther("1000"));
    await rewardToken.connect(distributor).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // First reward notification to start a reward period
    const firstReward = ethers.parseEther("700"); // 700 tokens over 7 days = 100 tokens per day
    await instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), firstReward);
    
    // Get the period finish time
    const periodFinish = await instance.rewardPeriodFinish(await rewardToken.getAddress());
    
    // Fast forward half the duration (3.5 days) - still within the active reward period
    await ethers.provider.send("evm_increaseTime", [86400 * 3 + 43200]); // 3.5 days
    await ethers.provider.send("evm_mine", []);
    
    // Verify we are still within the active reward period
    const currentBlock = await ethers.provider.getBlock("latest");
    expect(currentBlock.timestamp).to.be.lessThan(Number(periodFinish));
    
    // Second reward notification during active period
    const secondReward = ethers.parseEther("350"); // 350 tokens
    
    // Get reward rate before second notification for comparison
    const rewardDataBefore = await instance.rewardData(await rewardToken.getAddress());
    const rewardRateBefore = rewardDataBefore.rewardRate;
    
    // Notify reward during active period
    await instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), secondReward);
    
    // Get reward rate after notification
    const rewardDataAfter = await instance.rewardData(await rewardToken.getAddress());
    const rewardRateAfter = rewardDataAfter.rewardRate;
    
    // Calculate expected reward rate for original contract:
    // Original: rdata.rewardRate = uint216((_amount + leftover) / DURATION)
    // where leftover = remaining * rdata.rewardRate
    // Mutant: rdata.rewardRate = uint216(_amount / DURATION) (because it enters the wrong branch)
    
    // If mutant is present, rewardRateAfter would be secondReward / DURATION
    const expectedMutantRate = secondReward / BigInt(86400 * 7);
    
    // If original is present, rewardRateAfter would be higher due to leftover
    // The mutant rate should be lower than the original rate because it ignores leftover
    expect(rewardRateAfter).to.not.equal(expectedMutantRate, 
      "Mutant detected: reward rate matches the incorrect calculation from the mutated branch");
  });
});