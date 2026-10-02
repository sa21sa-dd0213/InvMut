import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - m9a42c805", function () {
  it("should kill mutant that replaces / with + in _rewardPerToken", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 for staking token and reward token
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    const rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const StakingFactory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StakingFactory.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();
    
    // Setup: add reward token and fund staking contract
    await staking.connect(owner).addReward(await rewardToken.getAddress());
    
    // User stakes tokens
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.connect(owner).transfer(user.address, stakeAmount);
    await stakingToken.connect(user).approve(await staking.getAddress(), stakeAmount);
    await staking.connect(user).stake(stakeAmount);
    
    // Distribute reward (1 reward token over 1 week)
    const rewardAmount = ethers.parseEther("1");
    await rewardToken.connect(owner).approve(await staking.getAddress(), rewardAmount);
    await staking.connect(owner).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Wait for some time (e.g., 3 days) to accumulate rewards
    const threeDays = 3 * 86400;
    await ethers.provider.send("evm_increaseTime", [threeDays]);
    await ethers.provider.send("evm_mine");
    
    // Calculate expected reward per token manually
    const DURATION = 86400 * 7; // 7 days
    const rewardRate = rewardAmount / BigInt(DURATION);
    const timeElapsed = BigInt(threeDays);
    const expectedRewardPerToken = (timeElapsed * rewardRate * ethers.parseEther("1")) / stakeAmount;
    
    // Get actual reward per token from contract
    const actualRewardPerToken = await staking.rewardPerToken(await rewardToken.getAddress());
    
    // The mutant would compute: rewardPerTokenStored + (timeDiff * rewardRate * 1e18 + totalSupply())
    // Which would give a MUCH larger value than expected
    // Original computes: rewardPerTokenStored + (timeDiff * rewardRate * 1e18 / totalSupply())
    // We expect the original calculation (small value), mutant would produce huge value
    expect(actualRewardPerToken).to.be.lessThan(ethers.parseEther("0.01")); // Original gives tiny value
    expect(actualRewardPerToken).to.equal(expectedRewardPerToken); // Exact match with original
  });
});

// Mock ERC20 for testing
// Note: In a real test environment, this contract should be deployed separately
// This is just the interface expected to be available