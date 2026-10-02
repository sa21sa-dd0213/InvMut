import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant m82cbe056 - setRewardsRecipient", function () {
  it("should send rewards to the specified recipient, not to the contract itself", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock tokens and contracts needed for CVXStaker constructor
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockERC20.deploy("CLP Token", "CLP", ethers.parseEther("1000000"));
    await clpToken.waitForDeployment();
    
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy mock booster
    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();
    
    // Deploy mock reward pool
    const MockRewardPool = await ethers.getContractFactory("MockRewardPool");
    const rewardPool = await MockRewardPool.deploy(await clpToken.getAddress(), await rewardToken.getAddress());
    await rewardPool.waitForDeployment();
    
    // Setup booster pool info
    await booster.setPoolInfo(0, {
      lptoken: await clpToken.getAddress(),
      token: await rewardToken.getAddress(),
      gauge: ethers.ZeroAddress,
      crvRewards: ethers.ZeroAddress,
      stash: ethers.ZeroAddress,
      shutdown: false
    });
    
    // Deploy CVXStaker
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const staker = await CVXStaker.deploy(
      addr1.address,  // operator
      await clpToken.getAddress(),  // clpToken
      await booster.getAddress(),  // booster
      [await rewardToken.getAddress()]  // rewardTokens
    );
    await staker.waitForDeployment();
    
    // Set up CVX pool info
    await staker.setCvxPoolInfo(0, await clpToken.getAddress(), await rewardPool.getAddress());
    
    // Set rewards recipient to addr2 (a specific address, not the contract itself)
    await staker.setRewardsRecipient(addr2.address);
    
    // Verify the rewards recipient is set to addr2, not the contract address
    const recipient = await staker.rewardsRecipient();
    expect(recipient).to.equal(addr2.address);
    expect(recipient).to.not.equal(await staker.getAddress());
    
    // Simulate rewards being sent to the staker contract
    // First, deposit some CLP tokens to the reward pool to simulate staking
    await clpToken.transfer(addr1.address, ethers.parseEther("1000"));
    await clpToken.connect(addr1).approve(await staker.getAddress(), ethers.parseEther("1000"));
    
    // Deposit and stake through the operator
    await staker.connect(addr1).depositAndStake(ethers.parseEther("500"));
    
    // Mint rewards to the reward pool for the staker contract
    await rewardPool.mintRewards(await staker.getAddress(), ethers.parseEther("100"));
    
    // Get rewards
    await staker.getReward(false);
    
    // Check that rewards were sent to addr2, not to the contract itself
    const rewardBalanceContract = await rewardToken.balanceOf(await staker.getAddress());
    const rewardBalanceRecipient = await rewardToken.balanceOf(addr2.address);
    
    // In the original, rewards go to addr2
    // In the mutant, rewards would go to the contract itself (address(this))
    expect(rewardBalanceRecipient).to.be.gt(0);
    expect(rewardBalanceContract).to.equal(0);
  });
});