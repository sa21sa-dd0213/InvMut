import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m94326f5d", function () {
  it("should detect mutant that replaces block.timestamp with block.prevrandao in _lastTimeRewardApplicable", async function () {
    const [owner, distributor, staker] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await TokenFactory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 token for rewards
    const rewardToken = await TokenFactory.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();

    // Add reward token
    await instance.connect(owner).addReward(await rewardToken.getAddress());

    // Transfer staking tokens to staker and approve
    await stakingToken.transfer(staker.address, ethers.parseEther("1000"));
    await stakingToken.connect(staker).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Transfer reward tokens to distributor and approve
    await rewardToken.transfer(distributor.address, ethers.parseEther("1000"));
    await rewardToken.connect(distributor).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Stake tokens
    const stakeAmount = ethers.parseEther("100");
    await instance.connect(staker).stake(stakeAmount);

    // Notify reward (distribute rewards for 1 week duration)
    const rewardAmount = ethers.parseEther("100");
    await instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);

    // Record reward per token after notification
    const rewardPerTokenBefore = await instance.rewardPerToken(await rewardToken.getAddress());

    // Advance time by 3 days (half of the reward period)
    await ethers.provider.send("evm_increaseTime", [86400 * 3]);
    await ethers.provider.send("evm_mine");

    // Check reward per token after time advancement
    // The mutant uses block.prevrandao instead of block.timestamp, which will give wrong results
    const rewardPerTokenAfter = await instance.rewardPerToken(await rewardToken.getAddress());

    // In the original contract, rewardPerToken should increase as time passes
    // In the mutant, it may not increase correctly or may use a random value
    const earnedBefore = await instance.earned(staker.address, await rewardToken.getAddress());

    // Advance time to the end of the reward period
    await ethers.provider.send("evm_increaseTime", [86400 * 4]);
    await ethers.provider.send("evm_mine");

    const earnedAfter = await instance.earned(staker.address, await rewardToken.getAddress());

    // In the original contract, after the full reward period, the staker should earn all rewards
    // In the mutant, the earned amount will be incorrect due to using prevrandao instead of timestamp
    // We expect the earned amount to be approximately rewardAmount * (stakeAmount / totalSupply)
    // With only one staker, they should earn all rewards
    const expectedEarned = ethers.parseEther("100"); // Full reward amount for single staker

    // The mutant will fail this assertion because prevrandao gives unpredictable results
    // The original contract would pass this check
    expect(earnedAfter).to.equal(expectedEarned);

    // Additionally, check that reward per token increased (mutant may break this)
    expect(rewardPerTokenAfter).to.be.gt(rewardPerTokenBefore);
  });
});