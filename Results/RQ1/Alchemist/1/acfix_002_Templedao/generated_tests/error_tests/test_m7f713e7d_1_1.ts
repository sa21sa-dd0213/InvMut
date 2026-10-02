import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m7f713e7d test", function () {
  it("should revert when calling notifyRewardAmount with a valid reward token (mutant incorrectly uses == instead of !=)", async function () {
    const [owner, distributor, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), distributor.address);
    await staking.waitForDeployment();
    
    // Add reward token (this sets lastUpdateTime to non-zero)
    await staking.connect(owner).addReward(await rewardToken.getAddress());
    
    // Fund reward token to distributor for transfer
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.mint(distributor.address, rewardAmount);
    await rewardToken.connect(distributor).approve(await staking.getAddress(), rewardAmount);
    
    // Attempt to notify reward - should revert because mutant uses == instead of !=
    await expect(
      staking.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount)
    ).to.be.revertedWith("unknown reward token");
  });
});