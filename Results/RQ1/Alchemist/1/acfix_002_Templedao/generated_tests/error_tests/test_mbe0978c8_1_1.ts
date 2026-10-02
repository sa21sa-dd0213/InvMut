import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - mutant mbe0978c8 test", function () {
  it("should kill mutant by verifying rewardPeriodFinish equals block.timestamp + DURATION after notifyRewardAmount", async function () {
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

    // Setup: add reward token and set reward distributor
    await instance.connect(owner).addReward(await rewardToken.getAddress());

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore.timestamp;

    // Call notifyRewardAmount with a specific amount
    const rewardAmount = ethers.parseEther("100");
    await rewardToken.transfer(distributor.address, rewardAmount);
    await rewardToken.connect(distributor).approve(await instance.getAddress(), rewardAmount);

    await instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);

    // Get the actual reward period finish from the contract
    const actualPeriodFinish = await instance.rewardPeriodFinish(await rewardToken.getAddress());

    // The expected period finish should be current timestamp + DURATION (86400 * 7 = 604800)
    const DURATION = 86400 * 7;
    const expectedPeriodFinish = currentTimestamp + DURATION;

    // Assert that the period finish equals the expected value
    // In the mutant, block.prevrandao would be used instead of block.timestamp,
    // so this assertion should fail on the mutant
    expect(actualPeriodFinish).to.equal(expectedPeriodFinish);
  });
});