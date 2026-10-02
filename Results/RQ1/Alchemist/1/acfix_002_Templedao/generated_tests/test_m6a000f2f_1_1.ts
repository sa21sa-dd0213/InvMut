import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m6a000f2f (division instead of subtraction in _notifyReward)", function () {
  let stakingToken: any;
  let rewardToken: any;
  let instance: any;
  let owner: any;
  let distributor: any;
  let user: any;

  beforeEach(async function () {
    [owner, distributor, user] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    stakingToken = await ERC20Factory.deploy("Staking Token", "STK");
    await stakingToken.waitForDeployment();
    rewardToken = await ERC20Factory.deploy("Reward Token", "RWD");
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    instance = await Factory.deploy(await stakingToken.getAddress(), await distributor.getAddress());
    await instance.waitForDeployment();

    // Setup: Add reward token and fund distributor
    await instance.connect(owner).addReward(await rewardToken.getAddress());
    await rewardToken.connect(distributor).approve(await instance.getAddress(), ethers.parseEther("1000"));
    await rewardToken.mint(distributor.address, ethers.parseEther("1000"));

    // User stakes some tokens
    await stakingToken.mint(user.address, ethers.parseEther("100"));
    await stakingToken.connect(user).approve(await instance.getAddress(), ethers.parseEther("100"));
    await instance.connect(user).stake(ethers.parseEther("100"));
  });

  it("should correctly calculate leftover rewards when notifying reward during an active period (detect division bug)", async function () {
    // First notification to start a reward period
    const rewardAmount1 = ethers.parseEther("700"); // 100 tokens per day for 7 days
    await instance.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      rewardAmount1
    );

    // Advance time by 3 days (halfway through the period)
    await ethers.provider.send("evm_increaseTime", [3 * 86400]);
    await ethers.provider.send("evm_mine");

    // Get current reward data
    const rewardDataBefore = await instance.rewardData(await rewardToken.getAddress());
    const periodFinishBefore = rewardDataBefore.periodFinish;
    const rewardRateBefore = rewardDataBefore.rewardRate;

    // Second notification with additional rewards
    const rewardAmount2 = ethers.parseEther("350"); // 50 tokens per day for 7 days
    await instance.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      rewardAmount2
    );

    // Get updated reward data
    const rewardDataAfter = await instance.rewardData(await rewardToken.getAddress());
    const newRewardRate = rewardDataAfter.rewardRate;

    // Calculate expected values
    const currentTime = await ethers.provider.getBlock("latest").then((b: any) => b.timestamp);
    const remaining = Number(periodFinishBefore) - currentTime;
    const leftover = BigInt(remaining) * rewardRateBefore;
    const expectedRate = (rewardAmount2 + leftover) / BigInt(7 * 86400);

    // Verify the new reward rate matches expected calculation (original behavior)
    // The mutant would produce a drastically different result due to division instead of subtraction
    expect(newRewardRate).to.equal(expectedRate);

    // Additional verification: check that rewards accumulate correctly for the user
    // Advance to end of first period (which is now extended)
    await ethers.provider.send("evm_increaseTime", [4 * 86400]);
    await ethers.provider.send("evm_mine");

    // Check earned rewards
    const earnedRewards = await instance.earned(user.address, await rewardToken.getAddress());
    
    // With the bug, the leftover would be calculated incorrectly, leading to wrong reward distribution
    // A correct implementation should give the user non-zero rewards
    expect(earnedRewards).to.be.gt(0);
  });
});