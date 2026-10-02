import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - _rewardPerToken division vs subtraction", function () {
  it("should detect the mutant by verifying reward per token calculation with non-zero time difference", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
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
    
    // User stakes tokens
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.transfer(user.address, stakeAmount);
    await stakingToken.connect(user).approve(await staking.getAddress(), stakeAmount);
    await staking.connect(user).stake(stakeAmount);
    
    // Notify reward with a specific amount
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.transfer(owner.address, rewardAmount);
    await rewardToken.connect(owner).approve(await staking.getAddress(), rewardAmount);
    await staking.notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Get the reward data before advancing time
    const rewardDataBefore = await staking.rewardData(await rewardToken.getAddress());
    const lastUpdateTime = Number(rewardDataBefore.lastUpdateTime);
    const periodFinish = Number(rewardDataBefore.periodFinish);
    const rewardPerTokenStored = rewardDataBefore.rewardPerTokenStored;
    const rewardRate = rewardDataBefore.rewardRate;
    
    // Advance time by 1 day (86400 seconds) to create a time difference
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine");
    
    // Get current reward per token from contract
    const actualRewardPerToken = await staking.rewardPerToken(await rewardToken.getAddress());
    
    // Calculate what the original should give (using subtraction)
    const blockTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
    const timeElapsed = Math.min(periodFinish, blockTimestamp) - lastUpdateTime;
    const totalSupply = await staking.totalSupply();
    
    const expectedRewardPerToken = rewardPerTokenStored + 
      ((BigInt(timeElapsed) * rewardRate * BigInt(1e18)) / totalSupply);
    
    // If mutant is present, the calculation will be different
    // because division will produce a much smaller or different value
    expect(actualRewardPerToken).to.not.equal(expectedRewardPerToken, 
      "If this assertion passes, the mutant is likely present (division produces different result)");
    
    // Additionally, check that the earned rewards are reasonable
    const earnedRewards = await staking.earned(user.address, await rewardToken.getAddress());
    expect(earnedRewards).to.be.gt(0, "User should have earned rewards");
  });
});