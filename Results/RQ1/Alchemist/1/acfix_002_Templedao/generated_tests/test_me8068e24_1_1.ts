import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant me8068e24", function () {
  it("should correctly calculate reward rate when notifying reward after period has finished", async function () {
    const [owner, distributor, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const StakingTokenFactory = await ethers.getContractFactory("ERC20Mock");
    const stakingToken = await StakingTokenFactory.deploy("Staking Token", "STK");
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 token for rewards
    const RewardTokenFactory = await ethers.getContractFactory("ERC20Mock");
    const rewardToken = await RewardTokenFactory.deploy("Reward Token", "RWD");
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const StaxLPStakingFactory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStakingFactory.deploy(
      await stakingToken.getAddress(),
      distributor.address
    );
    await staking.waitForDeployment();

    // Mint tokens to distributor
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.mint(distributor.address, rewardAmount);
    await rewardToken.connect(distributor).approve(await staking.getAddress(), rewardAmount);

    // Add reward token
    await staking.addReward(await rewardToken.getAddress());

    // First notification - start a reward period
    const firstAmount = ethers.parseEther("700");
    const DURATION = 86400 * 7; // 7 days

    // Advance time so we're at a clean block
    await ethers.provider.send("evm_setNextBlockTimestamp", [Math.floor(Date.now() / 1000)]);
    await ethers.provider.send("evm_mine", []);

    await staking.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      firstAmount
    );

    // Get the period finish time
    const periodFinish = await staking.rewardPeriodFinish(await rewardToken.getAddress());

    // Wait until after the reward period finishes
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(periodFinish) + 100]);
    await ethers.provider.send("evm_mine", []);

    // Second notification after period has finished
    const secondAmount = ethers.parseEther("1400");
    await rewardToken.mint(distributor.address, secondAmount);
    await rewardToken.connect(distributor).approve(await staking.getAddress(), secondAmount);

    await staking.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      secondAmount
    );

    // Get the reward data after second notification
    const rewardData = await staking.rewardData(await rewardToken.getAddress());

    // The reward rate should be exactly secondAmount / DURATION
    // If the mutant is active, it will include leftover from the expired period, making the rate incorrect
    const expectedRate = secondAmount / BigInt(DURATION);
    const actualRate = rewardData.rewardRate;

    // In the original code, since period has finished, rewardRate should be secondAmount / DURATION
    // In the mutant, it incorrectly calculates leftover from expired period, resulting in a different rate
    expect(actualRate).to.equal(expectedRate);
  });
});