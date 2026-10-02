import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant mcb26ae92 test", function () {
  it("should detect mutant that removes return from rewardPeriodFinish", async function () {
    const [owner, distributor] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();
    
    // Setup: add reward token and notify reward
    await instance.addReward(await rewardToken.getAddress());
    
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.transfer(distributor.address, rewardAmount);
    await rewardToken.connect(distributor).approve(await instance.getAddress(), rewardAmount);
    
    // Notify reward (this sets periodFinish)
    await instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Get the period finish timestamp from the contract
    const periodFinish = await instance.rewardPeriodFinish(await rewardToken.getAddress());
    
    // If the mutant is present, periodFinish will be 0 (default uint40)
    // If original, it should be block.timestamp + DURATION (86400 * 7 = 604800)
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    const expectedFinish = block.timestamp + 604800;
    
    // The mutant returns 0 instead of the actual periodFinish
    // This assertion will fail on the mutant (pass on original)
    expect(periodFinish).to.equal(expectedFinish);
  });
});