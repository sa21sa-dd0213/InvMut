import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - m70d1e945", function () {
  it("should kill mutant by verifying rewardPerToken calculation with division instead of subtraction", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    
    // Deploy a reward token
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Add reward token
    await instance.addReward(await rewardToken.getAddress());
    
    // Mint tokens for user
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.mint(user.address, stakeAmount);
    await stakingToken.connect(user).approve(await instance.getAddress(), stakeAmount);
    
    // User stakes tokens
    await instance.connect(user).stake(stakeAmount);
    
    // Distribute rewards - owner sends reward tokens
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.mint(owner.address, rewardAmount);
    await rewardToken.connect(owner).approve(await instance.getAddress(), rewardAmount);
    await instance.connect(owner).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Fast forward time to earn some rewards (7 days / 2 = half the reward period)
    const DURATION = 86400 * 7;
    await ethers.provider.send("evm_increaseTime", [DURATION / 2]);
    await ethers.provider.send("evm_mine", []);
    
    // Calculate expected rewardPerToken manually using correct formula:
    // rewardPerTokenStored + ((timeElapsed * rewardRate * 1e18) / totalSupply)
    // rewardRate = rewardAmount / DURATION
    // timeElapsed = DURATION / 2
    // totalSupply = stakeAmount
    
    const rewardRate = rewardAmount / BigInt(DURATION);
    const timeElapsed = BigInt(DURATION / 2);
    const expectedRewardPerToken = (timeElapsed * rewardRate * ethers.parseEther("1")) / stakeAmount;
    
    // Call rewardPerToken and verify it matches expected value
    const actualRewardPerToken = await instance.rewardPerToken(await rewardToken.getAddress());
    
    // The mutant uses subtraction instead of division, which would produce
    // a completely different (likely much larger or negative) result
    expect(actualRewardPerToken).to.equal(expectedRewardPerToken);
    
    // Also verify that the user's earned rewards are calculated correctly
    const earned = await instance.earned(user.address, await rewardToken.getAddress());
    const expectedEarned = (stakeAmount * expectedRewardPerToken) / ethers.parseEther("1");
    expect(earned).to.equal(expectedEarned);
  });
});