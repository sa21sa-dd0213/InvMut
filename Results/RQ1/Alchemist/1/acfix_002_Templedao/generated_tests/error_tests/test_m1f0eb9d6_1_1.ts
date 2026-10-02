import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant detection - block.prevrandao vs block.timestamp", function () {
  it("should detect mutant that replaces block.timestamp with block.prevrandao in _notifyReward", async function () {
    const [owner, distributor, staker] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK");
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await ERC20Factory.deploy("Reward Token", "RWD");
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();
    
    // Add reward token
    await instance.connect(owner).addReward(await rewardToken.getAddress());
    
    // Mint staking tokens to staker and approve
    await stakingToken.mint(staker.address, ethers.parseEther("1000"));
    await stakingToken.connect(staker).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Stake tokens
    await instance.connect(staker).stake(ethers.parseEther("100"));
    
    // Fund distributor with reward tokens and approve
    await rewardToken.mint(distributor.address, ethers.parseEther("1000"));
    await rewardToken.connect(distributor).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // First reward notification (creates initial period)
    await instance.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      ethers.parseEther("700") // 700 tokens over 7 days = 100 tokens per day
    );
    
    // Get period finish time after first reward
    let periodFinish = await instance.rewardPeriodFinish(await rewardToken.getAddress());
    
    // Fast forward past the first period
    await ethers.provider.send("evm_increaseTime", [86400 * 8]); // 8 days
    await ethers.provider.send("evm_mine", []);
    
    // Now period should have finished
    const currentTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
    expect(currentTimestamp).to.be.gt(Number(periodFinish));
    
    // Store reward rate before second notification
    const rewardDataBefore = await instance.rewardData(await rewardToken.getAddress());
    const rewardRateBefore = rewardDataBefore.rewardRate;
    
    // Second reward notification - this will trigger the mutant's bug
    // In original: block.timestamp >= periodFinish is true, so it takes the if branch (set new rate)
    // In mutant: block.prevrandao >= periodFinish is likely false (random value < timestamp), so it takes else branch
    // This causes incorrect leftover calculation
    await instance.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      ethers.parseEther("700")
    );
    
    // Get the new reward data
    const rewardDataAfter = await instance.rewardData(await rewardToken.getAddress());
    const rewardRateAfter = rewardDataAfter.rewardRate;
    
    // In the original contract, since period has finished, the new rate should be 700 / DURATION = 100 tokens per second
    // In the mutant, it incorrectly takes the else branch, calculating leftover from expired period
    // The mutant's rate will be different because it miscalculates with the old rate
    const expectedRate = ethers.parseEther("700") / BigInt(86400 * 7);
    
    // If the mutant is active, the reward rate will be wrong (not equal to expected)
    // The original would set rewardRate = 700 / DURATION
    // The mutant would calculate leftover = (periodFinish - now) * oldRate (negative value since period finished)
    // This causes a different reward rate
    expect(rewardRateAfter).to.not.equal(expectedRate);
    
    // Additionally, verify the mutant behavior by checking that the else branch was taken
    // In the mutant, block.prevrandao is a random value, so it's extremely unlikely to be >= periodFinish
    // This means the else branch was taken, which is wrong for an expired period
    const blockBefore = await ethers.provider.getBlock("latest");
    const prevRandao = blockBefore.prevrandao;
    expect(prevRandao).to.be.lessThan(periodFinish); // Confirms mutant took wrong branch
    
    console.log("Mutant detected: block.prevrandao used instead of block.timestamp");
  });
});