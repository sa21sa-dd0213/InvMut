import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m6d7d6ec8 test", function () {
  it("should detect mutant that removes else branch in _notifyReward by notifying reward before period ends", async function () {
    const [owner, distributor, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await staking.waitForDeployment();

    // Setup: Set reward distributor and add reward token
    await staking.setRewardDistributor(distributor.address);
    await staking.addReward(await rewardToken.getAddress());

    // Transfer reward tokens to distributor
    await rewardToken.transfer(distributor.address, ethers.parseEther("1000"));

    // First reward notification - start a reward period
    const rewardAmount1 = ethers.parseEther("100");
    await rewardToken.connect(distributor).approve(await staking.getAddress(), rewardAmount1);
    await staking.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount1);

    // Get period finish time after first notification
    let periodFinish = await staking.rewardPeriodFinish(await rewardToken.getAddress());

    // Fast forward to middle of the reward period (before it ends)
    const currentTime = (await ethers.provider.getBlock("latest"))!.timestamp;
    const midPeriod = currentTime + 3 * 86400; // 3 days into the 7-day period
    await ethers.provider.send("evm_setNextBlockTimestamp", [midPeriod]);
    await ethers.provider.send("evm_mine", []);

    // Record the reward rate before second notification
    const rewardDataBefore = await staking.rewardData(await rewardToken.getAddress());
    const rateBefore = rewardDataBefore.rewardRate;

    // Second reward notification - this should trigger the else branch
    const rewardAmount2 = ethers.parseEther("50");
    await rewardToken.connect(distributor).approve(await staking.getAddress(), rewardAmount2);
    await staking.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount2);

    // Get the reward rate after second notification
    const rewardDataAfter = await staking.rewardData(await rewardToken.getAddress());
    const rateAfter = rewardDataAfter.rewardRate;

    // Calculate expected rate manually for verification
    // Original: remaining = periodFinish - block.timestamp, leftover = remaining * oldRate, newRate = (rewardAmount2 + leftover) / DURATION
    const expectedRemaining = periodFinish - BigInt(midPeriod);
    const expectedLeftover = expectedRemaining * rateBefore;
    const expectedRate = (rewardAmount2 + expectedLeftover) / BigInt(86400 * 7);

    // If mutant is active (else branch removed), the rate will just be rewardAmount2 / DURATION
    const mutantRate = rewardAmount2 / BigInt(86400 * 7);

    // Assert that the actual rate matches the expected (original) rate, not the mutant rate
    expect(rateAfter).to.equal(expectedRate);
    expect(rateAfter).to.not.equal(mutantRate);

    // Additionally verify that user can stake and earn rewards correctly
    await stakingToken.transfer(user.address, ethers.parseEther("10"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("10"));
    await staking.connect(user).stake(ethers.parseEther("10"));

    // Fast forward to end of period
    const endTime = Number(periodFinish) + 100;
    await ethers.provider.send("evm_setNextBlockTimestamp", [endTime]);
    await ethers.provider.send("evm_mine", []);

    // Check that rewards are claimable
    const earned = await staking.earned(user.address, await rewardToken.getAddress());

    // If mutant is active, earned rewards would be different
    // The original properly accounts for leftover rewards, so earned > 0
    expect(earned).to.be.gt(0);
  });
});