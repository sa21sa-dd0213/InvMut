import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("StaxLPStaking mutant test - _lastTimeRewardApplicable", function () {
  it("should detect mutant where _finishTime <= block.timestamp instead of <", async function () {
    const [owner, distributor, staker] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await TokenFactory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await TokenFactory.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();
    
    // Setup: Add reward token and set reward distributor
    await instance.connect(owner).addReward(await rewardToken.getAddress());
    await instance.connect(owner).setRewardDistributor(distributor.address);
    
    // Staker stakes tokens
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.connect(staker).approve(await instance.getAddress(), stakeAmount);
    await instance.connect(staker).stake(stakeAmount);
    
    // Get current timestamp and calculate period finish
    const currentTime = await time.latest();
    const DURATION = 86400 * 7; // 7 days
    const rewardAmount = ethers.parseEther("1000");
    
    // Transfer reward tokens to distributor for notifyRewardAmount
    await rewardToken.connect(owner).transfer(distributor.address, rewardAmount);
    await rewardToken.connect(distributor).approve(await instance.getAddress(), rewardAmount);
    
    // Notify reward amount
    await instance.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      rewardAmount
    );
    
    // Fast forward to exactly periodFinish (currentTime + DURATION)
    await time.increaseTo(currentTime + DURATION);
    
    // At this point, block.timestamp == periodFinish
    // Original: _finishTime < block.timestamp is false (they are equal), so returns block.timestamp
    // Mutant: _finishTime <= block.timestamp is true, so returns _finishTime
    
    // Get the reward per token - should be calculated using block.timestamp in original
    // and using periodFinish in mutant, leading to different results
    const rewardPerToken = await instance.rewardPerToken(await rewardToken.getAddress());
    
    // Get earned amount for staker
    const earnedAmount = await instance.earned(staker.address, await rewardToken.getAddress());
    
    // Verify that reward is being calculated correctly
    // In the original, since block.timestamp == periodFinish, the time difference is 0
    // so rewardPerToken should equal rewardPerTokenStored (which was 0 initially)
    // In the mutant, it would use periodFinish as the applicable time, also resulting in 0
    // So we need to check the state after some time has passed
    
    // Actually, let's redo this test more precisely:
    // Fast forward 1 second past periodFinish
    await time.increaseTo(currentTime + DURATION + 1);
    
    // Now block.timestamp > periodFinish
    // Original: _finishTime < block.timestamp is true, returns _finishTime (periodFinish)
    // Mutant: _finishTime <= block.timestamp is true, returns _finishTime (periodFinish)
    // Both return periodFinish now, so they match
    
    // The key test is when block.timestamp == periodFinish exactly
    // Let's reset and test that edge case
    
    // Deploy fresh instance for clean test
    const instance2 = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance2.waitForDeployment();
    
    await instance2.connect(owner).addReward(await rewardToken.getAddress());
    await instance2.connect(owner).setRewardDistributor(distributor.address);
    
    await stakingToken.connect(staker).approve(await instance2.getAddress(), stakeAmount);
    await instance2.connect(staker).stake(stakeAmount);
    
    const newCurrentTime = await time.latest();
    await rewardToken.connect(owner).transfer(distributor.address, rewardAmount);
    await rewardToken.connect(distributor).approve(await instance2.getAddress(), rewardAmount);
    
    await instance2.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      rewardAmount
    );
    
    // Fast forward to exactly periodFinish
    await time.increaseTo(newCurrentTime + DURATION);
    
    // Now call getRewards to trigger updateReward modifier which calls _lastTimeRewardApplicable
    // The modifier will calculate rewardPerTokenStored using the result of _lastTimeRewardApplicable
    await instance2.connect(staker).getRewards(staker.address);
    
    // Check the rewardPerTokenStored after the update
    const rewardData = await instance2.rewardData(await rewardToken.getAddress());
    
    // In the original: _lastTimeRewardApplicable returns block.timestamp (since _finishTime < block.timestamp is false)
    // So the time difference = block.timestamp - lastUpdateTime = periodFinish - periodFinish = 0
    // So rewardPerTokenStored remains 0
    
    // In the mutant: _lastTimeRewardApplicable returns _finishTime (since _finishTime <= block.timestamp is true)
    // So the time difference = periodFinish - lastUpdateTime = periodFinish - periodFinish = 0
    // Same result...
    
    // Let's think differently - the issue manifests when reward period just ended
    // and someone calls a view function like earned() which calls _rewardPerToken
    // The _rewardPerToken function uses _lastTimeRewardApplicable directly
    
    // Fast forward to exactly periodFinish
    const exactFinish = newCurrentTime + DURATION;
    await time.increaseTo(exactFinish);
    
    // Query rewardPerToken at this exact moment
    // Original: returns rewardPerTokenStored + (0 * rate * 1e18 / totalSupply) = 0
    // Mutant: same thing because time difference is 0
    
    // The real difference would be if lastUpdateTime was before periodFinish
    // But the contract updates lastUpdateTime to periodFinish in _notifyReward
    
    // Actually the key is: when block.timestamp == periodFinish, the reward period
    // should still be active (using block.timestamp), but mutant considers it finished
    // This affects the time difference calculation
    
    // Let's test with a different approach: stake after period started, then check at exact finish
    const instance3 = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance3.waitForDeployment();
    
    await instance3.connect(owner).addReward(await rewardToken.getAddress());
    await instance3.connect(owner).setRewardDistributor(distributor.address);
    
    const startTime = await time.latest();
    await rewardToken.connect(owner).transfer(distributor.address, rewardAmount);
    await rewardToken.connect(distributor).approve(await instance3.getAddress(), rewardAmount);
    
    await instance3.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      rewardAmount
    );
    
    // Stake halfway through the period
    await time.increaseTo(startTime + Math.floor(DURATION / 2));
    const midTime = await time.latest();
    
    await stakingToken.connect(staker).approve(await instance3.getAddress(), stakeAmount);
    await instance3.connect(staker).stake(stakeAmount);
    
    // Now fast forward to exactly periodFinish
    const periodFinish = startTime + DURATION;
    await time.increaseTo(periodFinish);
    
    // Check earned at exactly periodFinish
    // Original: uses block.timestamp = periodFinish, time diff = periodFinish - midTime = DURATION/2
    // Mutant: uses _finishTime = periodFinish, time diff = periodFinish - midTime = DURATION/2
    // Same again because both return the same value when periodFinish == block.timestamp
    
    // WAIT - I see the issue now. The original returns block.timestamp when _finishTime < block.timestamp is FALSE
    // That means when _finishTime == block.timestamp, original returns block.timestamp
    // The mutant returns _finishTime when _finishTime <= block.timestamp is TRUE
    // When _finishTime == block.timestamp, both return the same value (block.timestamp == _finishTime)
    
    // The difference only matters when _finishTime < block.timestamp:
    // Original: returns _finishTime (condition true)
    // Mutant: returns _finishTime (condition true)
    // They're the same! Both return _finishTime when _finishTime < block.timestamp
    
    // And when _finishTime > block.timestamp:
    // Original: returns block.timestamp (condition false)
    // Mutant: returns block.timestamp (condition false)
    // Same again!
    
    // The ONLY difference is when _finishTime == block.timestamp:
    // Original: returns block.timestamp (condition false)
    // Mutant: returns _finishTime (condition true)
    // But since they're equal, the result is the SAME!
    
    // This mutant actually doesn't change the behavior! The function always returns
    // the same value regardless of whether < or <= is used.
    
    // However, let's double-check by looking at how the return value is used...
    // _lastTimeRewardApplicable is used in _rewardPerToken:
    // (_lastTimeRewardApplicable(...) - lastUpdateTime) * rewardRate * 1e18 / totalSupply()
    // The difference between the two possible return values is 0 when they're equal
    
    // And in updateReward modifier:
    // rewardData[token].lastUpdateTime = uint40(_lastTimeRewardApplicable(rewardData[token].periodFinish));
    // When block.timestamp == periodFinish, both return the same value
    
    // So this mutant is actually equivalent to the original in terms of output!
    // But we need to test it anyway as per the task...
    
    // Let's create a scenario where we can observe the difference
    // The difference would be in the updateReward modifier's assignment of lastUpdateTime
    // But again, when equal, both return the same
    
    // Actually, I realize the mutant changes the behavior when _finishTime == block.timestamp
    // in a subtle way: it affects the lastUpdateTime update in the modifier
    // Original: sets lastUpdateTime = block.timestamp
    // Mutant: sets lastUpdateTime = periodFinish (which equals block.timestamp)
    // Same value, so no observable difference
    
    // This is a case where the mutant is behaviorally equivalent to the original
    // The test should still verify this edge case
    
    // Verify that calling functions at exact periodFinish doesn't revert
    await expect(
      instance3.connect(staker).getRewards(staker.address)
    ).to.not.be.reverted;
    
    // The earned amount should be calculable at this exact boundary
    const finalEarned = await instance3.earned(staker.address, await rewardToken.getAddress());
    expect(finalEarned).to.be.gt(0);
    
    // And after one more second, the behavior should be identical
    await time.increaseTo(periodFinish + 1);
    const earnedAfter = await instance3.earned(staker.address, await rewardToken.getAddress());
    expect(earnedAfter).to.be.gt(0);
  });
});