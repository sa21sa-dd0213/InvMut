import { expect } from "chai";
import { ethers } } from "hardhat";

describe("StaxLPStaking - Kill mutant m3712788c", function () {
  it("should kill mutant that sets rewardDistributor to address(this) instead of constructor parameter", async function () {
    const [owner, distributor, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract with a specific distributor address (not the contract itself)
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), await distributor.getAddress());
    await instance.waitForDeployment();
    
    // Add reward token
    await instance.connect(owner).addReward(await rewardToken.getAddress());
    
    // Transfer reward tokens to the distributor
    await rewardToken.transfer(await distributor.getAddress(), ethers.parseEther("1000"));
    await rewardToken.connect(distributor).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // In the original contract, distributor can call notifyRewardAmount
    // In the mutant, rewardDistributor is set to address(this), so distributor call should revert
    await expect(
      instance.connect(distributor).notifyRewardAmount(
        await rewardToken.getAddress(),
        ethers.parseEther("1000")
      )
    ).to.be.revertedWith("not distributor");
  });
});