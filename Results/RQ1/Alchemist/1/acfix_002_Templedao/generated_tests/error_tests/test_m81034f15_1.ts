import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m81034f15 - _earned division bug", function () {
  it("should detect mutant that replaces subtraction with division in _earned calculation", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();
    
    // Add reward token
    await staking.addReward(await rewardToken.getAddress());
    
    // Transfer staking tokens to user and approve
    await stakingToken.transfer(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("1000"));
    
    // Transfer reward tokens to owner (distributor) and approve
    await rewardToken.approve(await staking.getAddress(), ethers.parseEther("10000"));
    
    // User stakes tokens
    const stakeAmount = ethers.parseEther("100");
    await staking.connect(user).stake(stakeAmount);
    
    // Notify reward (distribute rewards over 7 days)
    const rewardAmount = ethers.parseEther("700"); // 100 tokens per day for 7 days
    await staking.notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Fast forward 3 days
    await ethers.provider.send("evm_increaseTime", [86400 * 3]);
    await ethers.provider.send("evm_mine", []);
    
    // Get earned rewards using the view function
    const earned = await staking.earned(user.address, await rewardToken.getAddress());
    
    // Calculate expected rewards manually (original formula)
    // rewardPerToken = (timeElapsed * rewardRate * 1e18) / totalSupply
    // rewardRate = 700 / 604800 = ~0.001157 ethers per second
    // For 3 days (259200 seconds): rewardPerToken = (259200 * 0.001157 * 1e18) / 100e18 = ~3000
    // earned = (balance * (rewardPerToken - 0)) / 1e18 = (100e18 * rewardPerToken) / 1e18
    
    // The key insight: if we check earned rewards before any rewards are claimed,
    // the original formula subtracts 0 from rewardPerToken, while the mutant divides by 0
    // causing a revert or incorrect calculation
    
    // First, verify earned is reasonable (original would work, mutant would fail)
    // With division by userRewardPerTokenPaid (which is 0 initially), mutant would revert or return 0
    expect(earned).to.be.gt(0);
    
    // Now claim rewards to set userRewardPerTokenPaid to non-zero
    await staking.connect(user).getRewards(user.address);
    
    // Check that userRewardPerTokenPaid is now set
    const rewardPerTokenPaid = await staking.userRewardPerTokenPaid(user.address, await rewardToken.getAddress());
    expect(rewardPerTokenPaid).to.be.gt(0);
    
    // Fast forward another 2 days
    await ethers.provider.send("evm_increaseTime", [86400 * 2]);
    await ethers.provider.send("evm_mine", []);
    
    // Now check earned again - with non-zero userRewardPerTokenPaid
    // Original: (balance * (newRewardPerToken - oldRewardPerTokenPaid)) / 1e18
    // Mutant: (balance * (newRewardPerToken / oldRewardPerTokenPaid)) / 1e18
    // These will produce very different results
    const earned2 = await staking.earned(user.address, await rewardToken.getAddress());
    
    // The mutant would calculate a much smaller number (division instead of subtraction)
    // So if the value is reasonable (in the range of expected rewards), the original is working
    expect(earned2).to.be.gt(ethers.parseEther("0.1")); // Should have earned significant rewards
    
    // Verify the mutant would fail by comparing with a manual calculation
    // Get rewardPerToken to verify
    const rewardPerToken = await staking.rewardPerToken(await rewardToken.getAddress());
    const balance = await staking.balanceOf(user.address);
    
    // Expected using original formula: (balance * (rewardPerToken - rewardPerTokenPaid)) / 1e18
    const expectedEarned = (balance * (rewardPerToken - rewardPerTokenPaid)) / ethers.parseEther("1");
    
    // The earned value should match the original formula, not the mutant's division formula
    expect(earned2).to.equal(expectedEarned);
  });
});