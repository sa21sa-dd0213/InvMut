import { expect } from "chai";
import { ethers } } from "hardhat";

describe("CVXStaker mutant m0418d699 - getReward for-loop condition change", function () {
  it("should transfer reward tokens to rewardsRecipient when getReward is called, but mutant fails to transfer due to loop never executing", async function () {
    const [owner, operator, addr1] = await ethers.getSigners();
    
    // Deploy mock contracts for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockERC20.deploy("CLP Token", "CLP", ethers.parseEther("1000000"));
    await clpToken.waitForDeployment();
    
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy mock Booster
    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();
    
    // Deploy mock BaseRewardPool
    const MockBaseRewardPool = await ethers.getContractFactory("MockBaseRewardPool");
    const rewardPool = await MockBaseRewardPool.deploy(await clpToken.getAddress(), await rewardToken.getAddress());
    await rewardPool.waitForDeployment();
    
    // Setup Booster pool info
    await booster.setPoolInfo(0, await clpToken.getAddress(), await rewardToken.getAddress(), ethers.ZeroAddress, await rewardPool.getAddress(), ethers.ZeroAddress, false);
    
    // Deploy CVXStaker
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const staker = await CVXStaker.deploy(
      operator.address,
      await clpToken.getAddress(),
      await booster.getAddress(),
      [await rewardToken.getAddress()]
    );
    await staker.waitForDeployment();
    
    // Setup CVX pool info
    await staker.connect(owner).setCvxPoolInfo(0, await rewardToken.getAddress(), await rewardPool.getAddress());
    
    // Set rewards recipient
    await staker.connect(owner).setRewardsRecipient(addr1.address);
    
    // Fund reward pool with reward tokens for the staker
    await rewardToken.transfer(await rewardPool.getAddress(), ethers.parseEther("100"));
    
    // Set up the mock reward pool to have rewards for the staker
    await rewardPool.setBalance(await staker.getAddress(), ethers.parseEther("50"));
    await rewardPool.setEarned(await staker.getAddress(), ethers.parseEther("10"));
    
    // Record balance of rewards recipient before
    const balanceBefore = await rewardToken.balanceOf(addr1.address);
    
    // Call getReward
    await staker.connect(owner).getReward(false);
    
    // Check balance of rewards recipient after
    const balanceAfter = await rewardToken.balanceOf(addr1.address);
    
    // In the original contract, the loop would execute and transfer tokens
    // In the mutant, the loop condition i > rewardTokens.length is false initially, so loop never executes
    // Therefore the mutant will NOT transfer tokens to rewardsRecipient
    expect(balanceAfter).to.equal(balanceBefore.add(ethers.parseEther("10")));
  });
});