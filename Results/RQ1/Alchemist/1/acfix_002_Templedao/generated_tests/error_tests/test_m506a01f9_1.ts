import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Mutant m506a01f9", function () {
  it("should revert when non-distributor calls notifyRewardAmount", async function () {
    const [owner, addr1, distributor] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock reward token
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract with the distributor as the reward distributor
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const instance = await StaxLPStaking.deploy(await stakingToken.getAddress(), await distributor.getAddress());
    await instance.waitForDeployment();
    
    // Add reward token (only owner can do this)
    await instance.connect(owner).addReward(await rewardToken.getAddress());
    
    // Fund the reward token to the distributor for transfer
    await rewardToken.transfer(await distributor.getAddress(), ethers.parseEther("1000"));
    await rewardToken.connect(distributor).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Attempt to call notifyRewardAmount from addr1 (not the distributor) - should revert in original
    await expect(
      instance.connect(addr1).notifyRewardAmount(
        await rewardToken.getAddress(),
        ethers.parseEther("100")
      )
    ).to.be.revertedWith("not distributor");
  });
});