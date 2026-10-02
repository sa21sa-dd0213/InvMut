import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("StaxLPStaking mutant detection", function () {
  it("should detect m1bde1718: leftover calculation change from * to +", async function () {
    const [owner, distributor, staker] = await ethers.getSigners();
    
    // Deploy a mock ERC20 for staking and reward tokens
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK");
    await stakingToken.waitForDeployment();
    
    const rewardToken = await ERC20Factory.deploy("Reward Token", "RWD");
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking with required constructor args
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(
      await stakingToken.getAddress(),
      distributor.address
    );
    await instance.waitForDeployment();
    
    // Add reward token
    await instance.connect(owner).addReward(await rewardToken.getAddress());
    
    // Fund distributor with reward tokens
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.mint(distributor.address, rewardAmount);
    await rewardToken.connect(distributor).approve(await instance.getAddress(), rewardAmount);
    
    // Stake some tokens first
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.mint(staker.address, stakeAmount);
    await stakingToken.connect(staker).approve(await instance.getAddress(), stakeAmount);
    await instance.connect(staker).stake(stakeAmount);
    
    // First reward notification to start a period
    await instance.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      rewardAmount
    );
    
    // Get the period finish time
    const periodFinish = await instance.rewardPeriodFinish(await rewardToken.getAddress());
    
    // Fast forward to exactly when the period finishes
    await time.setNextBlockTimestamp(Number(periodFinish));
    await ethers.provider.send("evm_mine", []);
    
    // Get the current reward rate
    const rewardData = await instance.rewardData(await rewardToken.getAddress());
    const currentRewardRate = rewardData.rewardRate;
    
    // Now notify a new reward exactly at period finish
    const newRewardAmount = ethers.parseEther("500");
    await rewardToken.mint(distributor.address, newRewardAmount);
    await rewardToken.connect(distributor).approve(await instance.getAddress(), newRewardAmount);
    
    await instance.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      newRewardAmount
    );
    
    // Get the new reward data
    const newRewardData = await instance.rewardData(await rewardToken.getAddress());
    
    // Calculate what the correct reward rate should be:
    // Original: leftover = remaining * rewardRate = 0 * currentRewardRate = 0
    // newRate = (newRewardAmount + 0) / DURATION = newRewardAmount / DURATION
    const DURATION = 86400 * 7; // 7 days in seconds
    const expectedRate = newRewardAmount / BigInt(DURATION);
    
    // Mutant: leftover = remaining + rewardRate = 0 + currentRewardRate = currentRewardRate
    // newRate = (newRewardAmount + currentRewardRate) / DURATION
    const mutantRate = (newRewardAmount + currentRewardRate) / BigInt(DURATION);
    
    // The mutant would produce a different rate, so check if the actual rate matches the expected
    expect(newRewardData.rewardRate).to.equal(expectedRate);
    
    // Additionally, ensure it's NOT the mutant rate (if they differ)
    if (expectedRate !== mutantRate) {
      expect(newRewardData.rewardRate).to.not.equal(mutantRate);
    }
  });
});