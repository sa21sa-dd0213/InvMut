import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant mc64939a0 detection", function () {
  it("should detect mutant that replaces addition with multiplication in periodFinish calculation", async function () {
    const [owner, distributor, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("ERC20Mock");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    
    // Deploy a mock reward token
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();
    
    // Setup: Add reward token and fund distributor
    await instance.connect(owner).addReward(await rewardToken.getAddress());
    await rewardToken.connect(distributor).approve(await instance.getAddress(), ethers.parseEther("1000"));
    await rewardToken.connect(owner).transfer(distributor.address, ethers.parseEther("1000"));
    
    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const timestampBefore = blockBefore.timestamp;
    
    // Notify reward amount - this calls _notifyReward which has the mutant
    await instance.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      ethers.parseEther("100")
    );
    
    // Get the periodFinish after notification
    const periodFinish = await instance.rewardPeriodFinish(await rewardToken.getAddress());
    
    // Get current block timestamp after notification
    const blockNumAfter = await ethers.provider.getBlockNumber();
    const blockAfter = await ethers.provider.getBlock(blockNumAfter);
    const timestampAfter = blockAfter.timestamp;
    
    // In the original contract: periodFinish = block.timestamp + DURATION (7 days)
    // DURATION = 86400 * 7 = 604800 seconds
    // Expected: periodFinish should be approximately timestampAfter + 604800
    const DURATION = 86400 * 7; // 604800 seconds
    const expectedPeriodFinish = BigInt(timestampAfter + DURATION);
    const actualPeriodFinish = periodFinish;
    
    // The mutant would set periodFinish = block.timestamp * DURATION
    // which would be astronomically large (e.g., ~1.7e12 for current timestamps)
    // This would overflow uint40 (max value ~1.1e12) or produce an unrealistic value
    
    // Check that periodFinish is within a reasonable range of expected value
    // Allow some tolerance for block timestamp variation
    const tolerance = BigInt(100); // 100 seconds tolerance
    const difference = actualPeriodFinish > expectedPeriodFinish 
      ? actualPeriodFinish - expectedPeriodFinish 
      : expectedPeriodFinish - actualPeriodFinish;
    
    // The mutant would produce a value orders of magnitude too large
    // For the original: periodFinish ≈ timestamp + 604800 (reasonable)
    // For the mutant: periodFinish ≈ timestamp * 604800 (huge)
    expect(difference).to.be.lessThan(tolerance);
    
    // Additional verification: periodFinish should be greater than current timestamp
    expect(periodFinish).to.be.greaterThan(BigInt(timestampAfter));
    
    // For the mutant, periodFinish would be > 1e12 * 604800 which is enormous
    // Original gives ~1.7e9 + 604800 ≈ 1.7e9 (reasonable)
    // If it's not the mutant, the value should be reasonable
    const maxReasonablePeriodFinish = BigInt(timestampAfter + DURATION * 2);
    expect(actualPeriodFinish).to.be.lessThan(maxReasonablePeriodFinish);
  });
});