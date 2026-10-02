import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m951e5bfc", function () {
  it("should detect the arithmetic change from + to * in _notifyReward when notifying reward before periodFinish", async function () {
    const [owner, distributor] = await ethers.getSigners();
    
    // Deploy a mock ERC20 for staking token and reward token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking", "STK", 18);
    await stakingToken.waitForDeployment();
    const rewardToken = await MockERC20.deploy("Reward", "RWD", 18);
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();
    
    // Add reward token
    await instance.addReward(await rewardToken.getAddress());
    
    // Set reward distributor
    await instance.setRewardDistributor(distributor.address);
    
    // Fund distributor with reward tokens
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.mint(distributor.address, rewardAmount);
    await rewardToken.connect(distributor).approve(await instance.getAddress(), rewardAmount);
    
    // First notification: distribute 1000 tokens over 7 days
    await instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Get periodFinish and rewardRate after first notification
    let periodFinish1 = await instance.rewardPeriodFinish(await rewardToken.getAddress());
    let rewardData1 = await instance.rewardData(await rewardToken.getAddress());
    
    // Advance time by 3 days (leaving 4 days remaining)
    await ethers.provider.send("evm_increaseTime", [86400 * 3]);
    await ethers.provider.send("evm_mine", []);
    
    // Calculate expected leftover: remaining time * old rewardRate
    const remaining = Number(periodFinish1) - Math.floor(Date.now() / 1000);
    const leftover = BigInt(remaining) * rewardData1.rewardRate;
    
    // Second notification: distribute another 1000 tokens while period is still active
    const secondRewardAmount = ethers.parseEther("1000");
    await rewardToken.mint(distributor.address, secondRewardAmount);
    await rewardToken.connect(distributor).approve(await instance.getAddress(), secondRewardAmount);
    
    await instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), secondRewardAmount);
    
    // Get the new rewardRate
    const newRewardData = await instance.rewardData(await rewardToken.getAddress());
    const actualNewRewardRate = newRewardData.rewardRate;
    
    // Calculate expected rewardRate with original formula: (newAmount + leftover) / DURATION
    const DURATION = BigInt(86400 * 7);
    const expectedRewardRate = (secondRewardAmount + leftover) / DURATION;
    
    // If the mutant is present, the formula would be (newAmount * leftover) / DURATION
    const mutantRewardRate = (secondRewardAmount * leftover) / DURATION;
    
    // Assert that the actual rewardRate matches the original formula (addition), not the mutant (multiplication)
    // The original should produce a reasonable rate, while mutant would produce an astronomically large rate
    expect(actualNewRewardRate).to.equal(expectedRewardRate);
    expect(actualNewRewardRate).to.not.equal(mutantRewardRate);
  });
});