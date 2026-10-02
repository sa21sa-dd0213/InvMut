import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant detection", function () {
  it("should revert when notifyRewardAmount is called with amount = 0", async function () {
    const [owner, distributor] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking and reward token
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking with constructor arguments: stakingToken address, distributor address
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const instance = await StaxLPStaking.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();

    // Add reward token to the staking contract
    await instance.connect(owner).addReward(await rewardToken.getAddress());

    // Attempt to call notifyRewardAmount with amount = 0 - should revert in original
    await expect(
      instance.connect(distributor).notifyRewardAmount(
        await rewardToken.getAddress(),
        0
      )
    ).to.be.revertedWith("No reward");
  });
});