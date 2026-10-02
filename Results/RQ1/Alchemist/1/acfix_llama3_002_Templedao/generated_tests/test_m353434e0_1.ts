import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test", function () {
  it("should revert when notifyRewardAmount is called with amount = 0 (original behavior)", async function () {
    const [owner, distributor] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();
    
    // Add a reward token
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();
    
    await instance.connect(owner).addReward(await rewardToken.getAddress());
    
    // Fund distributor with reward tokens
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.mint(distributor.address, rewardAmount);
    await rewardToken.connect(distributor).approve(await instance.getAddress(), rewardAmount);
    
    // Now test: call notifyRewardAmount with amount = 0, expect revert
    await expect(
      instance.connect(distributor).notifyRewardAmount(
        await rewardToken.getAddress(),
        0
      )
    ).to.be.revertedWith("No reward");
  });
});