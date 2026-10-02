import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant detection - _notifyReward timestamp replacement", function () {
  it("should detect mutant where block.timestamp is replaced with block.prevrandao in _notifyReward", async function () {
    const [owner, distributor, staker] = await ethers.getSigners();
    
    // Deploy a mock ERC20 for staking token
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK");
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 for reward token
    const rewardToken = await ERC20Factory.deploy("Reward Token", "RWD");
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking with staking token and distributor
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();
    
    // Setup: add reward token and fund distributor
    await instance.connect(owner).addReward(await rewardToken.getAddress());
    
    // Fund distributor with reward tokens
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.mint(distributor.address, rewardAmount);
    await rewardToken.connect(distributor).approve(await instance.getAddress(), rewardAmount);
    
    // Stake some tokens first to have non-zero totalSupply
    const stakeAmount = ethers.parseEther("10");
    await stakingToken.mint(staker.address, stakeAmount);
    await stakingToken.connect(staker).approve(await instance.getAddress(), stakeAmount);
    await instance.connect(staker).stake(stakeAmount);
    
    // Get current block timestamp before notifying reward
    const blockBefore = await ethers.provider.getBlock("latest");
    const timestampBefore = blockBefore.timestamp;
    
    // Notify reward amount
    await instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Get the block after notification
    const blockAfter = await ethers.provider.getBlock("latest");
    const timestampAfter = blockAfter.timestamp;
    
    // Get the reward data to check lastUpdateTime
    const rewardData = await instance.rewardData(await rewardToken.getAddress());
    
    // In the original contract, lastUpdateTime should be set to block.timestamp (between timestampBefore and timestampAfter)
    // In the mutant, it would be set to block.prevrandao which is a random value, not a timestamp
    const lastUpdateTime = rewardData.lastUpdateTime;
    
    // Verify lastUpdateTime is a reasonable timestamp (between the block before and after)
    // This will fail for the mutant since block.prevrandao is a large random number
    expect(lastUpdateTime).to.be.gte(timestampBefore);
    expect(lastUpdateTime).to.be.lte(timestampAfter + 1); // Allow 1 second buffer
    
    // Also verify that rewardPerToken calculation works correctly with the proper timestamp
    const rewardPerToken = await instance.rewardPerToken(await rewardToken.getAddress());
    
    // In original: rewardPerToken should be > 0 since we have staked tokens and rewards
    // In mutant: with random lastUpdateTime, the calculation will be wildly incorrect
    expect(rewardPerToken).to.be.gt(0);
    
    // Additional check: verify periodFinish is also a valid timestamp
    const periodFinish = rewardData.periodFinish;
    expect(periodFinish).to.be.gte(lastUpdateTime);
    expect(periodFinish).to.be.lte(timestampAfter + 86400 * 7 + 1); // periodFinish = timestamp + DURATION (7 days)
  });
});