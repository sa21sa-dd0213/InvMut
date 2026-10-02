import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant mcb26ae92 (rewardPeriodFinish)", function () {
  it("should return the correct periodFinish value, not 0", async function () {
    const [owner, distributor] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy another ERC20 token for rewards
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking with constructor arguments: stakingToken address and distributor address
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();
    
    // Add reward token as owner
    await instance.addReward(await rewardToken.getAddress());
    
    // Set reward distributor
    await instance.setRewardDistributor(distributor.address);
    
    // Transfer some reward tokens to distributor for funding
    await rewardToken.transfer(distributor.address, ethers.parseEther("1000"));
    
    // Notify reward amount (this sets periodFinish to block.timestamp + DURATION)
    const rewardAmount = ethers.parseEther("100");
    await rewardToken.connect(distributor).approve(await instance.getAddress(), rewardAmount);
    await instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Get the periodFinish value from the contract
    const periodFinish = await instance.rewardPeriodFinish(await rewardToken.getAddress());
    
    // The periodFinish should be greater than current block timestamp (not 0)
    const latestBlock = await ethers.provider.getBlock("latest");
    expect(periodFinish).to.be.gt(latestBlock!.timestamp);
    
    // Also verify it's not zero (which is what the mutant would return)
    expect(periodFinish).to.not.equal(0);
  });
});