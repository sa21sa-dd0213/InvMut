import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - m0e9a4438", function () {
  it("should kill the mutant that replaces + with * in _rewardPerToken", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock reward token
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Add reward token
    await instance.addReward(await rewardToken.getAddress());
    
    // Fund user with staking tokens and approve
    await stakingToken.transfer(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // User stakes tokens
    await instance.connect(user).stake(ethers.parseEther("100"));
    
    // Owner funds rewards and notifies
    await rewardToken.transfer(owner.address, ethers.parseEther("1000"));
    await rewardToken.approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Notify reward of 100 tokens over DURATION (7 days)
    await instance.connect(owner).notifyRewardAmount(
      await rewardToken.getAddress(),
      ethers.parseEther("100")
    );
    
    // Advance time by 1 day (86400 seconds) to accrue some rewards
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);
    
    // Get reward per token after 1 day
    const rptAfter1Day = await instance.rewardPerToken(await rewardToken.getAddress());
    
    // The reward rate = 100 tokens / 7 days = ~14.2857 tokens per day
    // Expected reward per token = rewardPerTokenStored + (86400 * rewardRate * 1e18 / totalSupply)
    // With totalSupply = 100 tokens, rewardRate = 100e18 / 604800 (DURATION in seconds)
    // Expected = 0 + (86400 * (100e18/604800) * 1e18) / (100e18) = 86400 * 100e18 / 604800 = ~14.2857e18
    
    // Advance time by another day
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);
    
    const rptAfter2Days = await instance.rewardPerToken(await rewardToken.getAddress());
    
    // In the original contract, rptAfter2Days should be greater than rptAfter1Day (addition)
    // In the mutant (multiplication), rptAfter2Days would be astronomically larger
    // because it multiplies the stored value by the new ratio instead of adding
    
    // The key assertion: reward per token should increase linearly, not multiplicatively
    // After 2 days, the reward per token should be approximately double of 1 day
    const oneDayReward = rptAfter1Day;
    const twoDayReward = rptAfter2Days;
    
    // In original: twoDayReward should be ~2x oneDayReward (approximately)
    // In mutant: twoDayReward would be oneDayReward * (something large), causing massive difference
    const ratio = twoDayReward * BigInt(1e18) / oneDayReward;
    
    // Ratio should be approximately 2 (for original with linear addition)
    // For mutant with multiplication, ratio would be huge (exponential)
    expect(ratio).to.be.closeTo(
      ethers.parseEther("2"), 
      ethers.parseEther("0.5") // Allow some tolerance for rounding
    );
    
    // Additionally, check that rewards earned are reasonable
    const earned = await instance.earned(user.address, await rewardToken.getAddress());
    // Earned should be > 0 and less than the total notified reward
    expect(earned).to.be.gt(0);
    expect(earned).to.be.lt(ethers.parseEther("100"));
  });
});

// Helper contract for testing
// This should be deployed separately or use existing mock
contract("MockERC20", () => {
  // Mock ERC20 implementation for testing
});