import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Mutant m425f860e detection", function () {
  it("should detect mutant by calling getRewards with a reward token added (out-of-bounds access on <=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 for staking token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 for reward token
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();
    
    // Add reward token
    await staking.addReward(await rewardToken.getAddress());
    
    // Transfer some staking tokens to addr1 and approve
    await stakingToken.transfer(addr1.address, ethers.parseEther("1000"));
    await stakingToken.connect(addr1).approve(await staking.getAddress(), ethers.parseEther("1000"));
    
    // Stake tokens to have balance > 0
    await staking.connect(addr1).stake(ethers.parseEther("100"));
    
    // Fund reward distributor and notify reward
    await rewardToken.transfer(owner.address, ethers.parseEther("10000"));
    await rewardToken.approve(await staking.getAddress(), ethers.parseEther("1000"));
    
    // Set reward distributor to owner
    await staking.setRewardDistributor(owner.address);
    
    // Notify reward amount
    await staking.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("1000"));
    
    // Now call getRewards on addr1 - this should succeed on original but revert on mutant
    // because mutant uses i <= rewardTokens.length causing out-of-bounds access
    await expect(staking.connect(addr1).getRewards(addr1.address)).to.not.be.reverted;
  });
});