import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m61166086 - rewardPerToken arithmetic", function () {
  it("should detect mutant that replaces * with + in rewardPerToken calculation", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("ERC20Mock");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();
    
    // Add reward token
    await staking.addReward(await rewardToken.getAddress());
    
    // Transfer staking tokens to user and approve
    await stakingToken.transfer(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("1000"));
    
    // User stakes tokens
    await staking.connect(user).stake(ethers.parseEther("100"));
    
    // Transfer reward tokens to owner and notify reward
    await rewardToken.transfer(owner.address, ethers.parseEther("1000"));
    await rewardToken.approve(await staking.getAddress(), ethers.parseEther("1000"));
    
    // Notify a reward that will create a known reward rate
    const rewardAmount = ethers.parseEther("700"); // 700 tokens over 7 days = 100 tokens per day
    await staking.notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Fast forward 1 day (86400 seconds)
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);
    
    // Get the reward per token value
    const rewardPerToken = await staking.rewardPerToken(await rewardToken.getAddress());
    
    // Calculate expected reward per token manually:
    // Original formula: rewardPerTokenStored + ((timeDiff * rewardRate * 1e18) / totalSupply)
    // Mutant formula:   rewardPerTokenStored + ((timeDiff * rewardRate + 1e18) / totalSupply)
    // rewardRate = 700e18 / 604800 ≈ 1.1574e15 (700 tokens / 7 days in seconds)
    // timeDiff = 86400 (1 day)
    // totalSupply = 100e18
    
    // For the original: rewardRate * 1e18 = ~1.1574e15 * 1e18 = ~1.1574e33
    // For the mutant: rewardRate + 1e18 = ~1.1574e15 + 1e18 = ~1.0011574e18
    
    // The mutant will produce a MUCH smaller value because it adds instead of multiplies
    // Expected original value should be much larger than what mutant produces
    const rewardRate = await staking.rewardData(await rewardToken.getAddress());
    const rate = rewardRate.rewardRate;
    
    // The correct calculation would be: (86400 * rate * 1e18) / 100e18
    // The mutant calculation would be: (86400 * rate + 1e18) / 100e18
    
    // If rate > 0, the original result will be at least 86400 * 1e18 / 100e18 = 864 times larger
    // than the mutant result when rate = 1 (minimum non-zero rate)
    // With our actual rate (~1.1574e15), the difference is enormous
    
    // Assert that the reward per token is within expected range for the ORIGINAL contract
    // If the mutant is present, this value will be tiny (close to zero or just the stored value)
    expect(rewardPerToken).to.be.gt(ethers.parseEther("800")); // Original gives ~864, mutant gives ~0
    
    // Also verify earned rewards are reasonable
    const earned = await staking.earned(user.address, await rewardToken.getAddress());
    expect(earned).to.be.gt(ethers.parseEther("80")); // Should be ~100 tokens earned after 1 day
  });
});