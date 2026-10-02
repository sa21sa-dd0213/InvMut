import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant m3712788c", function () {
  it("should revert when calling notifyRewardAmount from the originally intended distributor address after mutant changes distributor to contract itself", async function () {
    const [owner, distributor, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock reward token
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking with distributor address
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), await distributor.getAddress());
    await staking.waitForDeployment();
    
    // Add reward token (only owner can do this)
    await staking.connect(owner).addReward(await rewardToken.getAddress());
    
    // Fund the distributor with reward tokens
    await rewardToken.transfer(await distributor.getAddress(), ethers.parseEther("1000"));
    await rewardToken.connect(distributor).approve(await staking.getAddress(), ethers.parseEther("1000"));
    
    // The test: in the original, calling notifyRewardAmount from distributor should succeed
    // In the mutant, rewardDistributor = address(this) instead of distributor address
    // So calling from the original distributor should revert
    await expect(
      staking.connect(distributor).notifyRewardAmount(
        await rewardToken.getAddress(),
        ethers.parseEther("100")
      )
    ).to.be.revertedWith("not distributor");
  });
});