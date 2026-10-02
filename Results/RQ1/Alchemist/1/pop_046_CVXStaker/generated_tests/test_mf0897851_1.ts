import { expect } from "chai";
import { ethers } } from "hardhat";

describe("CVXStaker mutant mf0897851 test", function () {
  it("should kill mutant by testing withdrawAndUnwrap when amount > clpBalance", async function () {
    const [owner, operator, recipient] = await ethers.getSigners();
    
    // Deploy mock CLP token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockERC20.deploy("CLP Token", "CLP", 18);
    await clpToken.waitForDeployment();
    
    // Deploy mock Booster
    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();
    
    // Deploy mock RewardPool
    const MockRewardPool = await ethers.getContractFactory("MockRewardPool");
    const rewardPool = await MockRewardPool.deploy();
    await rewardPool.waitForDeployment();
    
    // Setup constructor args
    const rewardTokens: string[] = [];
    const constructorArgs = [
      operator.address,
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    ];
    
    // Deploy CVXStaker
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const staker = await CVXStaker.deploy(...constructorArgs);
    await staker.waitForDeployment();
    
    // Setup CVX pool info
    await staker.connect(owner).setCvxPoolInfo(
      0,
      await clpToken.getAddress(),
      await rewardPool.getAddress()
    );
    
    // Configure reward pool mock to return specific balance
    const stakedAmount = ethers.parseEther("100");
    await rewardPool.setBalance(await staker.getAddress(), stakedAmount);
    
    // Transfer some CLP tokens to the staker (less than amount to withdraw)
    const clpBalance = ethers.parseEther("30");
    await clpToken.transfer(await staker.getAddress(), clpBalance);
    
    // Amount to withdraw is greater than clpBalance but less than total staked
    const withdrawAmount = ethers.parseEther("50");
    
    // In the original: amount (50) < clpBalance (30) is false, so toUnstake = 50 - 30 = 20
    // In the mutant: amount (50) > clpBalance (30) is true, so toUnstake = 0 (BUG!)
    
    // The test should fail on mutant because toUnstake would be 0 instead of 20
    // This means the reward pool's withdrawAndUnwrap would not be called with the correct amount
    await staker.connect(operator).withdrawAndUnwrap(withdrawAmount, false, recipient.address);
    
    // Check that recipient received the correct amount
    const recipientBalance = await clpToken.balanceOf(recipient.address);
    expect(recipientBalance).to.equal(withdrawAmount);
  });
});