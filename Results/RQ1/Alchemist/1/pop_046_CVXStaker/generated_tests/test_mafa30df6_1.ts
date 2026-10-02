import { expect } from "chai";
import { ethers } } from "hardhat";

describe("CVXStaker - getReward mutant mafa30df6", function () {
  it("should NOT transfer reward tokens when balance is zero (mutant removes zero-balance check)", async function () {
    const [owner, operator, rewardsRecipient] = await ethers.getSigners();
    
    // Deploy mock tokens and contracts needed for CVXStaker constructor
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockERC20.deploy("CLP Token", "CLP");
    await clpToken.waitForDeployment();
    
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD");
    await rewardToken.waitForDeployment();
    
    // Deploy mock Booster
    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();
    
    // Set up pool info on booster
    const mockRewards = await ethers.getContractFactory("MockRewardPool");
    const rewardsPool = await mockRewards.deploy();
    await rewardsPool.waitForDeployment();
    
    await booster.setPoolInfo(0, {
      lptoken: clpToken.target,
      token: rewardToken.target,
      gauge: ethers.ZeroAddress,
      crvRewards: ethers.ZeroAddress,
      stash: ethers.ZeroAddress,
      shutdown: false
    });
    
    // Deploy CVXStaker
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const staker = await CVXStaker.deploy(
      operator.address,
      clpToken.target,
      booster.target,
      [rewardToken.target]
    );
    await staker.waitForDeployment();
    
    // Set up CVX pool info
    await staker.connect(owner).setCvxPoolInfo(0, clpToken.target, rewardsPool.target);
    
    // Set rewards recipient
    await staker.connect(owner).setRewardsRecipient(rewardsRecipient.address);
    
    // Ensure reward token balance is zero in staker
    const balanceBefore = await rewardToken.balanceOf(staker.target);
    expect(balanceBefore).to.equal(0);
    
    // Listen for Transfer events
    const transferEventsBefore = [];
    rewardToken.on("Transfer", (from, to, value) => {
      transferEventsBefore.push({ from, to, value });
    });
    
    // Call getReward - this should NOT transfer any reward tokens since balance is zero
    const tx = await staker.connect(operator).getReward(false);
    await tx.wait();
    
    // Check that no Transfer events were emitted for reward token
    expect(transferEventsBefore.length).to.equal(0);
    
    // Verify balance is still zero
    const balanceAfter = await rewardToken.balanceOf(staker.target);
    expect(balanceAfter).to.equal(0);
  });
});