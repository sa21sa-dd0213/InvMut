import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant mf8007ad3", function () {
  it("should kill the mutant by testing remaining time calculation in notifyRewardAmount", async function () {
    const [owner, distributor, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await TokenFactory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await TokenFactory.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), await distributor.getAddress());
    await instance.waitForDeployment();
    
    // Setup: Add reward token and fund distributor
    await instance.connect(owner).addReward(await rewardToken.getAddress());
    await rewardToken.connect(distributor).approve(await instance.getAddress(), ethers.parseEther("10000"));
    
    // First notification - start a reward period
    const firstRewardAmount = ethers.parseEther("1000");
    const DURATION = 86400 * 7; // 1 week
    const tx1 = await instance.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      firstRewardAmount
    );
    await tx1.wait();
    
    // Record the initial reward rate
    const initialRewardData = await instance.rewardData(await rewardToken.getAddress());
    const initialRewardRate = initialRewardData.rewardRate;
    const expectedInitialRate = firstRewardAmount / BigInt(DURATION);
    expect(initialRewardRate).to.equal(expectedInitialRate);
    
    // Advance time by 2 days (not enough to finish the period)
    await ethers.provider.send("evm_increaseTime", [172800]); // 2 days
    await ethers.provider.send("evm_mine", []);
    
    // Get the remaining time and current reward rate
    const rewardDataBefore = await instance.rewardData(await rewardToken.getAddress());
    const periodFinish = Number(rewardDataBefore.periodFinish);
    const currentTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
    const remainingTimeActual = periodFinish - currentTimestamp;
    const currentRewardRate = rewardDataBefore.rewardRate;
    
    // Calculate leftover based on actual remaining time
    const leftoverActual = BigInt(remainingTimeActual) * currentRewardRate;
    
    // Notify another reward while period is still active
    const secondRewardAmount = ethers.parseEther("500");
    const tx2 = await instance.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      secondRewardAmount
    );
    await tx2.wait();
    
    // Get the updated reward data
    const rewardDataAfter = await instance.rewardData(await rewardToken.getAddress());
    const updatedRewardRate = rewardDataAfter.rewardRate;
    
    // Calculate expected rate using block.timestamp (original behavior)
    const expectedNewRate = (secondRewardAmount + leftoverActual) / BigInt(DURATION);
    
    // Calculate what rate would be with block.prevrandao (mutant behavior)
    // block.prevrandao is not predictable, but it will likely produce a different result
    // The key assertion: if the mutant is present, the rate will NOT match expectedNewRate
    // because block.prevrandao will give a nonsensical "remaining" value
    
    // Assert that the actual rate matches the expected rate (using block.timestamp)
    // This will fail on the mutant because block.prevrandao produces wrong remaining time
    expect(updatedRewardRate).to.equal(expectedNewRate);
    
    // Additional verification: the period should have been extended by DURATION
    const expectedNewFinish = BigInt(currentTimestamp + DURATION);
    expect(rewardDataAfter.periodFinish).to.equal(expectedNewFinish);
    
    // Verify the reward token was transferred correctly
    const contractBalance = await rewardToken.balanceOf(await instance.getAddress());
    expect(contractBalance).to.equal(firstRewardAmount + secondRewardAmount);
  });
});