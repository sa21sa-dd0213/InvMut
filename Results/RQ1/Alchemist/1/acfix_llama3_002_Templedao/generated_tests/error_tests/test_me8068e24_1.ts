import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant me8068e24", function () {
  it("should detect mutant that replaces block.timestamp >= rdata.periodFinish with false", async function () {
    const [owner, distributor, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const StaxLPStakingFactory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStakingFactory.deploy(await stakingToken.getAddress(), distributor.address);
    await staking.waitForDeployment();
    
    // Set reward distributor
    await staking.connect(owner).setRewardDistributor(distributor.address);
    
    // Add reward token
    await staking.connect(owner).addReward(await rewardToken.getAddress());
    
    // Transfer reward tokens to distributor
    await rewardToken.transfer(distributor.address, ethers.parseEther("2000"));
    await rewardToken.connect(distributor).approve(await staking.getAddress(), ethers.parseEther("2000"));
    
    // First reward notification: 1000 tokens over 7 days
    const DURATION = 86400 * 7;
    const firstRewardAmount = ethers.parseEther("1000");
    await staking.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), firstRewardAmount);
    
    // Get the reward rate after first notification
    const rewardData = await staking.rewardData(await rewardToken.getAddress());
    const firstRewardRate = rewardData.rewardRate;
    
    // Expected rate: 1000e18 / 604800
    const expectedFirstRate = firstRewardAmount / BigInt(DURATION);
    expect(firstRewardRate).to.equal(expectedFirstRate);
    
    // Advance time past the period finish
    await ethers.provider.send("evm_increaseTime", [DURATION + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Second reward notification: another 1000 tokens
    const secondRewardAmount = ethers.parseEther("1000");
    await staking.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), secondRewardAmount);
    
    // Get the reward rate after second notification
    const rewardDataAfter = await staking.rewardData(await rewardToken.getAddress());
    const secondRewardRate = rewardDataAfter.rewardRate;
    
    // On the original contract, since period has finished, rate should be simply amount / DURATION
    // On the mutant (false condition), it will go to else branch and calculate leftover + new amount
    const expectedSecondRate = secondRewardAmount / BigInt(DURATION);
    
    // If mutant is present, the rate will be different because it incorrectly calculates leftover
    expect(secondRewardRate).to.equal(expectedSecondRate);
  });
});