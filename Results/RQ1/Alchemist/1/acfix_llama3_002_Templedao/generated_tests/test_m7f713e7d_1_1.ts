import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Mutant m7f713e7d test", function () {
  it("should revert when calling notifyRewardAmount with an existing reward token due to mutated condition", async function () {
    const [owner, distributor] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const instance = await StaxLPStaking.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();

    // First add the reward token (this should succeed)
    await instance.connect(owner).addReward(await rewardToken.getAddress());

    // Transfer some reward tokens to the distributor for funding
    await rewardToken.connect(owner).transfer(distributor.address, ethers.parseEther("1000"));

    // Approve the staking contract to spend distributor's reward tokens
    await rewardToken.connect(distributor).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Try to call notifyRewardAmount with the existing reward token
    // In the original contract this would succeed, but the mutant (with == 0 instead of != 0)
    // will revert because the reward token already exists (lastUpdateTime != 0)
    await expect(
      instance.connect(distributor).notifyRewardAmount(
        await rewardToken.getAddress(),
        ethers.parseEther("500")
      )
    ).to.be.revertedWith("unknown reward token");
  });
});