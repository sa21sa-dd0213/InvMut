import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Mutant m46528045 detection", function () {
  it("should detect exponentiation operator replacing multiplication in _notifyReward", async function () {
    const [owner, distributor, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK");
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 token for rewards
    const rewardToken = await ERC20Factory.deploy("Reward Token", "RWD");
    await rewardToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();

    // Setup: Add reward token
    await instance.connect(owner).addReward(await rewardToken.getAddress());

    // Setup: Transfer reward tokens to distributor for notification
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.mint(distributor.address, rewardAmount);
    await rewardToken.connect(distributor).approve(await instance.getAddress(), rewardAmount);

    // First reward notification to start the period
    await instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);

    // Get the period finish time after first notification
    let periodFinish = await instance.rewardPeriodFinish(await rewardToken.getAddress());

    // Fast forward halfway through the period to have remaining time
    const DURATION = 86400 * 7; // 7 days in seconds
    const halfDuration = Math.floor(DURATION / 2);
    await ethers.provider.send("evm_increaseTime", [halfDuration]);
    await ethers.provider.send("evm_mine", []);

    // Calculate expected values for the second notification
    // After half period: remaining = DURATION - halfDuration = halfDuration
    const remaining = DURATION - halfDuration;

    // Get the current rewardRate from the first notification
    // Initial rewardRate = rewardAmount / DURATION
    const initialRewardRate = rewardAmount / BigInt(DURATION);

    // Calculate what leftover should be with multiplication: remaining * rewardRate
    const expectedLeftover = BigInt(remaining) * initialRewardRate;

    // Second reward amount
    const secondRewardAmount = ethers.parseEther("500");
    await rewardToken.mint(distributor.address, secondRewardAmount);
    await rewardToken.connect(distributor).approve(await instance.getAddress(), secondRewardAmount);

    // Perform the second notification - this is where the bug would manifest
    await instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), secondRewardAmount);

    // Get the new reward rate after second notification
    // In the original: newRewardRate = (secondRewardAmount + expectedLeftover) / DURATION
    // In the mutant: newRewardRate = (secondRewardAmount + (remaining ** rewardRate)) / DURATION
    // Since rewardRate is a large number, exponentiation would produce astronomically larger value
    const expectedNewRewardRate = (secondRewardAmount + expectedLeftover) / BigInt(DURATION);

    // Read the actual reward rate from the contract
    const rewardData = await instance.rewardData(await rewardToken.getAddress());
    const actualRewardRate = rewardData.rewardRate;

    // The mutant would produce a reward rate that is orders of magnitude larger
    // due to exponentiation instead of multiplication
    // If the contract behaves correctly (original), this assertion passes
    // If the mutant is present, the actual reward rate will be vastly different
    expect(actualRewardRate).to.equal(expectedNewRewardRate);

    // Additional verification: check that period finish is correctly set
    const newPeriodFinish = await instance.rewardPeriodFinish(await rewardToken.getAddress());
    const block = await ethers.provider.getBlock("latest");
    const expectedPeriodFinish = BigInt(block!.timestamp) + BigInt(DURATION);
    expect(newPeriodFinish).to.equal(expectedPeriodFinish);
  });
});