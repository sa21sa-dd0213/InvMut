import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m527d224e - constructor sets rewardDistributor to address(0)", function () {
  it("should fail when calling notifyRewardAmount from the intended distributor because constructor sets rewardDistributor to address(0)", async function () {
    const [owner, distributor, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking with a legitimate distributor address
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), await distributor.getAddress());
    await instance.waitForDeployment();
    
    // Add the reward token to the staking contract
    await instance.connect(owner).addReward(await rewardToken.getAddress());
    
    // Transfer reward tokens to the distributor
    await rewardToken.connect(owner).transfer(await distributor.getAddress(), ethers.parseEther("1000"));
    
    // Approve staking contract to spend distributor's reward tokens
    await rewardToken.connect(distributor).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Attempt to call notifyRewardAmount from the intended distributor
    // This should revert because the constructor set rewardDistributor to address(0) instead of the passed distributor
    await expect(
      instance.connect(distributor).notifyRewardAmount(
        await rewardToken.getAddress(),
        ethers.parseEther("100")
      )
    ).to.be.revertedWith("not distributor");
    
    // Additionally, verify that no one can call notifyRewardAmount since rewardDistributor is address(0)
    // Even the owner cannot call it because the modifier checks msg.sender == rewardDistributor
    await rewardToken.connect(owner).approve(await instance.getAddress(), ethers.parseEther("1000"));
    await expect(
      instance.connect(owner).notifyRewardAmount(
        await rewardToken.getAddress(),
        ethers.parseEther("100")
      )
    ).to.be.revertedWith("not distributor");
  });
});