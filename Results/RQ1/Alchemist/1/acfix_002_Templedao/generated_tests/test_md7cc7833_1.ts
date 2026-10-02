import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant md7cc7833", function () {
  it("should revert when notifyRewardAmount is called with amount = 0", async function () {
    const [owner, distributor] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();
    
    // Add reward token
    await instance.connect(owner).addReward(await rewardToken.getAddress());
    
    // Set reward distributor
    await instance.connect(owner).setRewardDistributor(distributor.address);
    
    // Attempt to call notifyRewardAmount with amount = 0 - should revert
    await expect(
      instance.connect(distributor).notifyRewardAmount(
        await rewardToken.getAddress(),
        0
      )
    ).to.be.revertedWith("No reward");
  });
});