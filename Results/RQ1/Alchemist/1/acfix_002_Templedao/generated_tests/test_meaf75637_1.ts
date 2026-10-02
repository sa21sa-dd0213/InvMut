import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant meaf75637", function () {
  it("should kill mutant that changes _lastTimeRewardApplicable from < to <=", async function () {
    const [owner, distributor, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 for staking token and reward token
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await ERC20Factory.deploy("Staking", "STK", 18);
    await stakingToken.waitForDeployment();
    const rewardToken = await ERC20Factory.deploy("Reward", "RWD", 18);
    await rewardToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(
      await stakingToken.getAddress(),
      distributor.address
    );
    await instance.waitForDeployment();

    // Setup: add reward token and approve tokens
    await instance.connect(owner).addReward(await rewardToken.getAddress());
    await instance.connect(owner).setRewardDistributor(distributor.address);
    
    // User stakes some tokens
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.connect(user).approve(await instance.getAddress(), stakeAmount);
    await instance.connect(user).stake(stakeAmount);

    // Distributor notifies a reward with amount that makes rewardRate = 1 wei per second
    const rewardAmount = ethers.parseEther("604800"); // 7 days * 1 wei per second = 604800 seconds in a week
    await rewardToken.connect(distributor).approve(await instance.getAddress(), rewardAmount);
    
    // Record the block timestamp before notification
    const blockBefore = await ethers.provider.getBlock("latest");
    const notifyTime = blockBefore!.timestamp;
    
    await instance.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      rewardAmount
    );

    // Advance time to exactly the period finish (notifyTime + DURATION = 604800 seconds later)
    const DURATION = 86400 * 7; // 604800
    const periodFinish = notifyTime + DURATION;
    
    // Mine a block exactly at periodFinish timestamp
    await ethers.provider.send("evm_setNextBlockTimestamp", [periodFinish]);
    await ethers.provider.send("evm_mine", []);

    // Check the rewardPerToken - it should have stopped accumulating at periodFinish
    // In original: when _finishTime == block.timestamp, it returns _finishTime (not block.timestamp)
    // In mutant: when _finishTime <= block.timestamp, it returns block.timestamp
    
    // At exactly periodFinish, the original returns periodFinish, mutant returns block.timestamp (which equals periodFinish)
    // So both would return the same value at this exact moment.
    // To distinguish, we need to check that after periodFinish, the reward rate doesn't continue to accrue
    
    // Advance one more second past periodFinish
    await ethers.provider.send("evm_setNextBlockTimestamp", [periodFinish + 1]);
    await ethers.provider.send("evm_mine", []);

    // Now check rewardPerToken
    const rewardPerToken = await instance.rewardPerToken(await rewardToken.getAddress());
    
    // Calculate expected rewardPerToken in original contract:
    // _rewardPerToken = rewardData.rewardPerTokenStored + ((_lastTimeRewardApplicable - lastUpdateTime) * rewardRate * 1e18) / totalSupply
    // _lastTimeRewardApplicable for periodFinish < block.timestamp (604801 > 604800) returns periodFinish (604800)
    // So delta time = periodFinish - notifyTime = 604800 seconds
    // rewardPerToken = 0 + ((604800 - notifyTime) * 1 * 1e18) / 100e18
    // Since notifyTime was at the block when notification happened, and lastUpdateTime = notifyTime
    // delta = 604800, so rewardPerToken = (604800 * 1 * 1e18) / 100e18 = 6048
    
    const expectedRewardPerToken = ethers.parseEther("6048"); // 604800 * 1e18 / 100e18 = 6048
    
    // In the mutant, _lastTimeRewardApplicable returns block.timestamp (604801) instead of periodFinish (604800)
    // So delta = 604801 - notifyTime = 604801, rewardPerToken = 604801 * 1e18 / 100e18 = 6048.01
    
    // The original returns 6048, mutant returns ~6048.01
    // Since we're dealing with integer math, the mutant would give a slightly higher value
    
    expect(rewardPerToken).to.equal(expectedRewardPerToken);
    
    // Additionally, check that earned rewards don't continue accruing after periodFinish
    const earnedAfter = await instance.earned(user.address, await rewardToken.getAddress());
    
    // Expected earned = (100e18 * 6048) / 1e18 = 604800 (since rewardRate was 1 wei/sec for 604800 seconds)
    const expectedEarned = ethers.parseEther("604800");
    expect(earnedAfter).to.equal(expectedEarned);
  });
});