import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - ma974816e", function () {
  it("should kill the mutant by verifying correct earned calculation with multiplication instead of addition", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking with staking token and owner as distributor
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const instance = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Add reward token
    await instance.addReward(await rewardToken.getAddress());
    
    // Transfer staking tokens to user and approve contract
    const stakeAmount = ethers.parseEther("1000");
    await stakingToken.transfer(user.address, stakeAmount);
    await stakingToken.connect(user).approve(await instance.getAddress(), stakeAmount);
    
    // User stakes tokens
    await instance.connect(user).stake(stakeAmount);
    
    // Fund rewards to the contract
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.transfer(owner.address, rewardAmount);
    await rewardToken.approve(await instance.getAddress(), rewardAmount);
    
    // Notify reward amount (sets reward rate for 7 days)
    await instance.notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Fast forward time to accumulate some rewards (e.g., 1 day)
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);
    
    // Check earned rewards
    const earned = await instance.earned(user.address, await rewardToken.getAddress());
    
    // The original contract calculates: (balance * (rewardPerToken - userRewardPerTokenPaid)) / 1e18 + claimable
    // The mutant calculates: (balance + (rewardPerToken - userRewardPerTokenPaid)) / 1e18 + claimable
    // For a large balance (1000e18), the mutant will return a much smaller value
    // We expect the earned amount to be proportional to the stake (multiplication)
    
    // Expected minimum earned after 1 day: at least (1000e18 * (rewardRate * 86400 * 1e18 / totalSupply)) / 1e18
    // rewardRate = 1000e18 / 604800 ≈ 1.65e15 per second
    // After 1 day: ~1.65e15 * 86400 ≈ 1.42e20
    // rewardPerToken increase: (86400 * 1.65e15 * 1e18) / 1000e18 ≈ 1.42e17
    // earned = (1000e18 * 1.42e17) / 1e18 = 1.42e20
    
    // The mutant would give: (1000e18 + 1.42e17) / 1e18 ≈ 1000.142 (basically 1 wei in terms of actual tokens)
    // So the mutant's earned value would be approximately 1 wei (since division by 1e18 of a number close to 1000e18 gives ~1000, which is just the balance component)
    
    // Assert that earned is much greater than the balance (indicating multiplication worked correctly)
    expect(earned).to.be.gt(stakeAmount.div(10)); // Should be at least 10% of stake after 1 day with 1:1 reward ratio
    
    // Additional assertion: the earned amount should be reasonable (not equal to just the balance component)
    // The mutant would return approximately stakeAmount / 1e18 ≈ 1000 wei, which is tiny
    expect(earned).to.be.gt(ethers.parseEther("10")); // Should be at least 10 tokens earned
  });
});