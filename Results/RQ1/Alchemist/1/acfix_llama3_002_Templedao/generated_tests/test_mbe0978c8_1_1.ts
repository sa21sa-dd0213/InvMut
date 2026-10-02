import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - mbe0978c8", function () {
  it("should kill the mutant by verifying reward period finish uses block.timestamp not block.prevrandao", async function () {
    const [owner, distributor] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking and rewards
    const MockToken = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();
    
    // Setup: owner adds reward token and transfers reward tokens to distributor
    await instance.addReward(await rewardToken.getAddress());
    await rewardToken.transfer(distributor.address, ethers.parseEther("1000"));
    await rewardToken.connect(distributor).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Get the current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const timestampBefore = blockBefore.timestamp;
    
    // Notify reward amount
    const rewardAmount = ethers.parseEther("100");
    await instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Get the period finish
    const periodFinish = await instance.rewardPeriodFinish(await rewardToken.getAddress());
    
    // Get the block timestamp after the transaction
    const blockNumAfter = await ethers.provider.getBlockNumber();
    const blockAfter = await ethers.provider.getBlock(blockNumAfter);
    const timestampAfter = blockAfter.timestamp;
    
    // DURATION is 86400 * 7 = 604800 seconds
    const DURATION = 86400 * 7;
    
    // The period finish should be approximately block.timestamp + DURATION
    // Since we don't know exactly which block's timestamp was used, 
    // we check it's in a reasonable range
    const minExpected = timestampBefore + DURATION;
    const maxExpected = timestampAfter + DURATION;
    
    // For the original contract, periodFinish should be between minExpected and maxExpected
    // For the mutant, it will be block.prevrandao + DURATION which is a huge random number
    // We expect the mutant to fail this assertion because block.prevrandao is not a timestamp
    expect(periodFinish).to.be.at.least(minExpected);
    expect(periodFinish).to.be.at.most(maxExpected);
    
    // Additional check: period finish should be reasonable (not a huge random number)
    // block.prevrandao is typically a very large number (like 10^77)
    expect(periodFinish).to.be.lessThan(ethers.parseEther("1")); // Less than 10^18, reasonable timestamp
  });
});