import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant mdb2ff6e7 (replaced >= with <= in _notifyReward)", function () {
  let stakingToken: any;
  let rewardToken: any;
  let staking: any;
  let owner: any;
  let distributor: any;
  let user: any;

  beforeEach(async function () {
    [owner, distributor, user] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for staking and rewards
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking with staking token and distributor
    const StakingFactory = await ethers.getContractFactory("StaxLPStaking");
    staking = await StakingFactory.deploy(await stakingToken.getAddress(), await distributor.getAddress());
    await staking.waitForDeployment();

    // Transfer some staking tokens to user
    await stakingToken.transfer(user.address, ethers.parseEther("1000"));
    
    // Transfer reward tokens to distributor
    await rewardToken.transfer(distributor.address, ethers.parseEther("10000"));
    
    // Approve staking contract to spend user's staking tokens
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("1000"));
    
    // Approve staking contract to spend distributor's reward tokens
    await rewardToken.connect(distributor).approve(await staking.getAddress(), ethers.parseEther("10000"));
    
    // Owner adds reward token
    await staking.addReward(await rewardToken.getAddress());
  });

  it("should kill mutant by notifying reward during active period and checking reward rate is correctly accumulated", async function () {
    // Step 1: User stakes tokens
    await staking.connect(user).stake(ethers.parseEther("100"));
    
    // Step 2: First reward notification - starts a reward period
    const rewardAmount1 = ethers.parseEther("1000");
    const DURATION = 86400 * 7; // 7 days
    
    await staking.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      rewardAmount1
    );
    
    // Step 3: Wait for some time to pass within the reward period (but not finish it)
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine", []);
    
    // Step 4: Get the current reward data after first notification
    const rewardDataAfterFirst = await staking.rewardData(await rewardToken.getAddress());
    const periodFinish = rewardDataAfterFirst.periodFinish;
    const rewardRate1 = rewardDataAfterFirst.rewardRate;
    
    // Verify period is still active
    expect(periodFinish).to.be.gt(await ethers.provider.getBlock("latest").then((b: any) => b.timestamp));
    
    // Step 5: Second reward notification while period is still active
    const rewardAmount2 = ethers.parseEther("500");
    await staking.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      rewardAmount2
    );
    
    // Step 6: Check the reward rate after second notification
    const rewardDataAfterSecond = await staking.rewardData(await rewardToken.getAddress());
    const rewardRate2 = rewardDataAfterSecond.rewardRate;
    
    // Calculate expected reward rate for original contract:
    // Original: rdata.rewardRate = uint216((_amount + leftover) / DURATION)
    // where leftover = remaining * rdata.rewardRate
    const remaining = Number(periodFinish) - (await ethers.provider.getBlock("latest").then((b: any) => b.timestamp));
    const leftover = BigInt(remaining) * BigInt(rewardRate1);
    const expectedRewardRate = (rewardAmount2 + leftover) / BigInt(DURATION);
    
    // Mutant would set rewardRate = amount / DURATION (without leftover)
    const mutantRewardRate = rewardAmount2 / BigInt(DURATION);
    
    // If the reward rate matches the expected (with leftover), original contract is working
    // If it matches mutant (without leftover), the mutant is detected
    // The test expects the original behavior (with leftover)
    expect(rewardRate2).to.equal(expectedRewardRate, 
      "Mutant detected: reward rate should include leftover from previous period");
    
    // Additional verification: mutant would have a different reward rate
    expect(rewardRate2).to.not.equal(mutantRewardRate,
      "Mutant detected: reward rate incorrectly set to amount/DURATION without leftover");
    
    // Step 7: Verify that the period finish was extended correctly
    const newPeriodFinish = rewardDataAfterSecond.periodFinish;
    const expectedNewFinish = BigInt(await ethers.provider.getBlock("latest").then((b: any) => b.timestamp)) + BigInt(DURATION);
    expect(newPeriodFinish).to.equal(expectedNewFinish);
  });
});