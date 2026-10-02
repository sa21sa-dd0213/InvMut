import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant m2e767c9c (setRewardDistributor)", function () {
  it("should allow external distributor to call notifyRewardAmount after being set via setRewardDistributor", async function () {
    const [owner, distributor, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a reward token
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking with staking token and initial distributor
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Add reward token (only owner can do this)
    await instance.addReward(await rewardToken.getAddress());
    
    // Set the reward distributor to the external distributor address
    await instance.setRewardDistributor(distributor.address);
    
    // Fund the distributor with reward tokens
    await rewardToken.transfer(distributor.address, ethers.parseEther("1000"));
    
    // Approve the staking contract to spend distributor's reward tokens
    await rewardToken.connect(distributor).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Attempt to notify reward from the external distributor address
    // The original contract should succeed; the mutant (which sets rewardDistributor to address(this)) should revert
    await expect(
      instance.connect(distributor).notifyRewardAmount(
        await rewardToken.getAddress(),
        ethers.parseEther("1000")
      )
    ).to.not.be.reverted;
    
    // Verify that the reward was actually added by checking reward rate
    const rewardData = await instance.rewardData(await rewardToken.getAddress());
    expect(rewardData.rewardRate).to.be.gt(0);
  });
});