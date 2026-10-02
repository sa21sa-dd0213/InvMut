import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant test - notifyRewardAmount with zero amount", function () {
  it("should revert when calling notifyRewardAmount with amount = 0", async function () {
    const [owner, distributor] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK");
    await stakingToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();

    // Deploy a reward token
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD");
    await rewardToken.waitForDeployment();

    // Setup: Add reward token
    await instance.connect(owner).addReward(await rewardToken.getAddress());

    // Setup: Transfer some reward tokens to distributor and approve
    await rewardToken.mint(distributor.address, ethers.parseEther("1000"));
    await rewardToken.connect(distributor).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Attempt to call notifyRewardAmount with amount = 0 - should revert
    await expect(
      instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), 0)
    ).to.be.revertedWith("No reward");
  });
});