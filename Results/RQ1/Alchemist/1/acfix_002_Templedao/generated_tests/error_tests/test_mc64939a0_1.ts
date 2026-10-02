import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant detection - mc64939a0", function () {
  it("should detect the mutant that replaces addition with multiplication in _notifyReward periodFinish calculation", async function () {
    const [owner, distributor, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 for staking token and reward token
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    const rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking with required constructor arguments
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const instance = await StaxLPStaking.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();
    
    // Set reward distributor
    await instance.connect(owner).setRewardDistributor(distributor.address);
    
    // Add reward token
    await instance.connect(owner).addReward(await rewardToken.getAddress());
    
    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const timestampBefore = blockBefore.timestamp;
    
    // Transfer reward tokens to distributor and approve
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.transfer(distributor.address, rewardAmount);
    await rewardToken.connect(distributor).approve(await instance.getAddress(), rewardAmount);
    
    // Notify reward amount
    await instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Check the periodFinish - in the original it should be timestamp + DURATION (604800)
    // In the mutant it would be timestamp * DURATION which is astronomically large and would overflow uint40
    const periodFinish = await instance.rewardPeriodFinish(await rewardToken.getAddress());
    
    // Get current block timestamp after notification
    const blockNumAfter = await ethers.provider.getBlockNumber();
    const blockAfter = await ethers.provider.getBlock(blockNumAfter);
    const timestampAfter = blockAfter.timestamp;
    
    const DURATION = 86400 * 7; // 604800
    
    // The periodFinish should be approximately timestamp + DURATION
    // It could be timestampBefore + DURATION or timestampAfter + DURATION depending on when the tx was mined
    const expectedMin = timestampBefore + DURATION;
    const expectedMax = timestampAfter + DURATION;
    
    // For the original: periodFinish should be between expectedMin and expectedMax
    // For the mutant: periodFinish would be a completely different value (overflowed uint40)
    expect(Number(periodFinish)).to.be.within(expectedMin, expectedMax);
    
    // Additional check: periodFinish should NOT be close to timestamp * DURATION
    // timestamp * DURATION would be around 1.7e9 * 6e5 ≈ 1e15, which would overflow uint40 (max ~1.1e12)
    // So the mutant would produce a very small or zero value
    expect(Number(periodFinish)).to.be.greaterThan(timestampBefore);
    expect(Number(periodFinish)).to.be.lessThan(timestampBefore + DURATION + 1000); // Allow some buffer
  });
});