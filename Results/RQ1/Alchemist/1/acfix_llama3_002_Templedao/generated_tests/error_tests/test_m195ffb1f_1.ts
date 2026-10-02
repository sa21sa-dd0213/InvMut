import { expect } from "chai";
import { ethers } } from "hardhat";

describe("StaxLPStaking - Kill mutant m195ffb1f", function () {
  it("should correctly compute earned rewards as sum, not product, of new earnings and claimable rewards", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000"));
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();
    
    // Add reward token
    await staking.addReward(await rewardToken.getAddress());
    
    // Transfer staking tokens to user
    await stakingToken.transfer(user.address, ethers.parseEther("100"));
    
    // User stakes 50 tokens
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("100"));
    await staking.connect(user).stake(ethers.parseEther("50"));
    
    // Owner distributes first batch of rewards (100 tokens over 7 days)
    await rewardToken.approve(await staking.getAddress(), ethers.parseEther("200"));
    await staking.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("100"));
    
    // Fast forward 3 days
    await ethers.provider.send("evm_increaseTime", [3 * 86400]);
    await ethers.provider.send("evm_mine", []);
    
    // Check earned rewards after 3 days - user should have some unclaimed rewards
    const earnedAfter3Days = await staking.earned(user.address, await rewardToken.getAddress());
    expect(earnedAfter3Days).to.be.gt(0);
    
    // Fast forward another 4 days (total 7 days, first reward period ends)
    await ethers.provider.send("evm_increaseTime", [4 * 86400]);
    await ethers.provider.send("evm_mine", []);
    
    // Check earned rewards at end of first period
    const earnedEndOfPeriod = await staking.earned(user.address, await rewardToken.getAddress());
    
    // Distribute second batch of rewards (another 100 tokens)
    await staking.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("100"));
    
    // Fast forward 1 more day
    await ethers.provider.send("evm_increaseTime", [1 * 86400]);
    await ethers.provider.send("evm_mine", []);
    
    // Check earned rewards after second period started
    const earnedAfterSecondPeriod = await staking.earned(user.address, await rewardToken.getAddress());
    
    // The mutant would compute: (newEarnings) / 1e18 * claimableRewards
    // Original computes: (newEarnings) / 1e18 + claimableRewards
    // Since claimableRewards > 0 and newEarnings > 0, the mutant would produce a different result
    
    // Verify that earned is the sum (original behavior) not the product (mutant behavior)
    // We can check that earned is greater than just the first period rewards
    expect(earnedAfterSecondPeriod).to.be.gt(earnedEndOfPeriod);
    
    // If mutant was present, earned would be (newEarnings * claimableRewards) / 1e18
    // which would likely be much smaller than the sum
    // The test will pass on original but fail on mutant
    
    console.log("Earned after first period:", earnedEndOfPeriod.toString());
    console.log("Earned after second period:", earnedAfterSecondPeriod.toString());
  });
});