import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant m80325dc6", function () {
  it("should revert when rewardPerToken is called with zero total supply due to division by zero in mutant", async function () {
    const [owner, rewardDistributor] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("ERC20Mock");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking with staking token and reward distributor
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(
      await stakingToken.getAddress(),
      rewardDistributor.address
    );
    await instance.waitForDeployment();

    // Add reward token
    await instance.connect(owner).addReward(await rewardToken.getAddress());

    // Transfer some reward tokens to rewardDistributor and approve
    await rewardToken.mint(rewardDistributor.address, ethers.parseEther("1000"));
    await rewardToken.connect(rewardDistributor).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Notify reward amount (this sets reward rate even though totalSupply is 0)
    await instance.connect(rewardDistributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      ethers.parseEther("700") // 700 tokens over 7 days
    );

    // Now call rewardPerToken when totalSupply() == 0
    // Original should return rewardPerTokenStored (some value)
    // Mutant should revert with division by zero
    await expect(
      instance.rewardPerToken(await rewardToken.getAddress())
    ).to.not.be.reverted;
  });
});