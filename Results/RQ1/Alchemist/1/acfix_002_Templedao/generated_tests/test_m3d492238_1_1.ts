import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Mutant m3d492238 (DURATION changed from 86400*7 to 86400+7)", function () {
  it("should detect mutant by verifying reward period duration and rate calculation", async function () {
    const [owner, distributor, staker] = await ethers.getSigners();

    // Deploy a mock ERC20 for staking token
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 for reward token
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking with the staking token and distributor
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), distributor.address);
    await staking.waitForDeployment();

    // Mint tokens to distributor and approve
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.mint(distributor.address, rewardAmount);
    await rewardToken.connect(distributor).approve(await staking.getAddress(), rewardAmount);

    // Add reward token to staking contract
    await staking.connect(owner).addReward(await rewardToken.getAddress());

    // Get block timestamp before notify
    const blockBefore = await ethers.provider.getBlock("latest");
    const timestampBefore = blockBefore.timestamp;

    // Notify reward amount
    await staking.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      rewardAmount
    );

    // Get reward data after notify
    const rewardData = await staking.rewardData(await rewardToken.getAddress());
    const periodFinish = rewardData.periodFinish;
    const rewardRate = rewardData.rewardRate;

    // The correct DURATION is 86400 * 7 = 604800 seconds
    // The mutant uses 86400 + 7 = 86407 seconds

    // For original: rewardRate = rewardAmount / 604800
    // For mutant: rewardRate = rewardAmount / 86407

    const expectedPeriodFinish = timestampBefore + 604800; // Original expected period finish
    const expectedRewardRate = rewardAmount / BigInt(604800); // Original expected rate

    // Check if period finish matches original (should fail on mutant since mutant uses 86407)
    // Mutant period finish would be timestampBefore + 86407
    expect(periodFinish).to.equal(expectedPeriodFinish);

    // Check if reward rate matches original
    expect(rewardRate).to.equal(expectedRewardRate);

    // Additionally, verify that after exactly 7 days, the reward period is finished in original
    // but not yet in mutant (mutant would still have 7 seconds remaining)
    await ethers.provider.send("evm_increaseTime", [604800]); // Advance exactly 7 days
    await ethers.provider.send("evm_mine");

    // In original, periodFinish should be <= current timestamp (reward period ended)
    // In mutant, periodFinish would still be 7 seconds in the future
    const blockAfter = await ethers.provider.getBlock("latest");
    const currentTimestamp = blockAfter.timestamp;

    // For original: periodFinish (timestampBefore + 604800) <= currentTimestamp
    // For mutant: periodFinish (timestampBefore + 86407) > currentTimestamp
    // This assertion should pass on original but fail on mutant
    expect(periodFinish).to.be.lte(currentTimestamp);
  });
});