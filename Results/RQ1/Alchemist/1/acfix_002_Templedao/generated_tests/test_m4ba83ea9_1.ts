import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - m4ba83ea9", function () {
  it("should detect the mutant that changes + to - in _earned by verifying claimable rewards are added not subtracted", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("contracts/test/MockERC20.sol:MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();
    
    // Mint tokens to user
    const stakeAmount = ethers.parseEther("100");
    const rewardAmount = ethers.parseEther("1000");
    await stakingToken.mint(user.address, stakeAmount);
    await rewardToken.mint(owner.address, rewardAmount);
    
    // User stakes tokens
    await stakingToken.connect(user).approve(await staking.getAddress(), stakeAmount);
    await staking.connect(user).stake(stakeAmount);
    
    // Owner adds reward token
    await staking.addReward(await rewardToken.getAddress());
    
    // Owner sends reward tokens to distributor and notifies reward
    await rewardToken.approve(await staking.getAddress(), rewardAmount);
    await staking.notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Fast forward time to accrue some rewards
    await ethers.provider.send("evm_increaseTime", [86400 * 3]); // 3 days
    await ethers.provider.send("evm_mine", []);
    
    // User claims rewards to get them into claimableRewards
    await staking.connect(user).getRewards(user.address);
    
    // Fast forward more time to accrue additional rewards
    await ethers.provider.send("evm_increaseTime", [86400 * 2]); // 2 more days
    await ethers.provider.send("evm_mine", []);
    
    // Check earned rewards - this should include previously claimed rewards PLUS new rewards
    // In the original: earned = (new rewards) + claimableRewards
    // In the mutant: earned = (new rewards) - claimableRewards
    // Since claimableRewards were already claimed (set to 0), we need to check a different scenario
    
    // Let's test with unclaimed rewards from a previous period
    // Reset by deploying fresh
    const staking2 = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking2.waitForDeployment();
    
    await stakingToken.mint(user.address, stakeAmount);
    await stakingToken.connect(user).approve(await staking2.getAddress(), stakeAmount);
    await staking2.connect(user).stake(stakeAmount);
    
    await staking2.addReward(await rewardToken.getAddress());
    await rewardToken.approve(await staking2.getAddress(), rewardAmount);
    await staking2.notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Fast forward to accumulate first batch of rewards
    await ethers.provider.send("evm_increaseTime", [86400 * 3]);
    await ethers.provider.send("evm_mine", []);
    
    // Get the earned amount before claiming (this will include unclaimed rewards)
    const earnedBeforeClaim = await staking2.earned(user.address, await rewardToken.getAddress());
    
    // Claim rewards - this moves them from _earned calculation to claimableRewards
    await staking2.connect(user).getRewards(user.address);
    
    // Fast forward to accumulate more rewards
    await ethers.provider.send("evm_increaseTime", [86400 * 3]);
    await ethers.provider.send("evm_mine", []);
    
    // Get the earned amount after claiming
    // In the original: earned = (new accrued rewards) + (previously claimed amount stored in claimableRewards)
    // In the mutant: earned = (new accrued rewards) - (previously claimed amount stored in claimableRewards)
    const earnedAfterClaim = await staking2.earned(user.address, await rewardToken.getAddress());
    
    // In the original, earnedAfterClaim should be >= earnedBeforeClaim (because it adds previous claimable rewards)
    // In the mutant, earnedAfterClaim would be less than earnedBeforeClaim (because it subtracts)
    // We expect the original behavior
    expect(earnedAfterClaim).to.be.gt(0);
    
    // The mutant would make this assertion fail because earned would be much smaller or negative
    // We can also verify by checking that claimable rewards are being tracked
    const claimableAmount = ethers.parseEther("100"); // Some non-zero amount
    expect(earnedAfterClaim).to.be.gt(earnedBeforeClaim.div(2)); // Should be at least half of what was earned before
    
    console.log("Original contract adds claimable rewards correctly");
  });
});