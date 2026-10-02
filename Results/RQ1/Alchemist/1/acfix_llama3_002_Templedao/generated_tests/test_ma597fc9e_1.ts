import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant ma597fc9e test", function () {
  it("should kill mutant by verifying rewardPerToken increases over time", async function () {
    const [owner, staker] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    
    // Deploy a mock reward token
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();
    
    // Add reward token
    await staking.connect(owner).addReward(await rewardToken.getAddress());
    
    // Fund staker with staking tokens and approve
    await stakingToken.transfer(staker.address, ethers.parseEther("100"));
    await stakingToken.connect(staker).approve(await staking.getAddress(), ethers.parseEther("100"));
    
    // Stake tokens
    await staking.connect(staker).stake(ethers.parseEther("100"));
    
    // Fund reward distributor and notify reward
    await rewardToken.transfer(owner.address, ethers.parseEther("1000"));
    await rewardToken.connect(owner).approve(await staking.getAddress(), ethers.parseEther("1000"));
    
    // Notify reward (100 tokens over 1 week)
    await staking.connect(owner).notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("100"));
    
    // Record rewardPerToken right after notification
    const rewardPerTokenAfterNotify = await staking.rewardPerToken(await rewardToken.getAddress());
    
    // Fast forward 3 days (half of the reward period)
    await ethers.provider.send("evm_increaseTime", [3 * 86400]);
    await ethers.provider.send("evm_mine", []);
    
    // Check rewardPerToken again - it should have increased
    const rewardPerTokenLater = await staking.rewardPerToken(await rewardToken.getAddress());
    
    // The mutant would subtract instead of add, causing rewardPerToken to decrease
    // The original contract would show an increase
    expect(rewardPerTokenLater).to.be.gt(rewardPerTokenAfterNotify);
  });
});

// Helper contract for testing
contract("MockERC20", function () {
  // This is a placeholder - in actual test, deploy a standard ERC20
});