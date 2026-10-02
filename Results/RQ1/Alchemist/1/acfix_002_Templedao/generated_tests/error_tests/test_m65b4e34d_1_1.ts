import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m65b4e34d - RewardAdded event emission", function () {
  it("should emit RewardAdded event when notifyRewardAmount is called, killing the mutant that removes the event", async function () {
    const [owner, distributor] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockTokenFactory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockTokenFactory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();

    // Deploy a reward token
    const rewardToken = await MockTokenFactory.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Add reward token to the staking contract
    await instance.connect(owner).addReward(await rewardToken.getAddress());

    // Fund the distributor with reward tokens and approve the staking contract
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.connect(distributor).approve(await instance.getAddress(), rewardAmount);

    // Expect the RewardAdded event to be emitted when notifyRewardAmount is called
    await expect(
      instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount)
    ).to.emit(instance, "RewardAdded").withArgs(await rewardToken.getAddress(), rewardAmount);
  });
});