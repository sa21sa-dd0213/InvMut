import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant detection - _lastTimeRewardApplicable", function () {
  it("should detect mutant by comparing rewardPerToken before and after reward period end", async function () {
    const [owner, distributor, staker] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("ERC20Mock");
    const stakingToken = await MockToken.deploy("Staking", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy reward token
    const rewardToken = await MockToken.deploy("Reward", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();

    // Setup: add reward token and fund distributor
    await instance.connect(owner).addReward(await rewardToken.getAddress());
    await rewardToken.connect(owner).transfer(distributor.address, ethers.parseEther("1000"));
    await rewardToken.connect(distributor).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Stake some tokens first so totalSupply > 0
    await stakingToken.connect(owner).transfer(staker.address, ethers.parseEther("100"));
    await stakingToken.connect(staker).approve(await instance.getAddress(), ethers.parseEther("100"));
    await instance.connect(staker).stake(ethers.parseEther("100"));

    // Notify reward - this sets periodFinish to block.timestamp + DURATION (7 days)
    await instance.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      ethers.parseEther("700") // 700 tokens over 7 days = 100 tokens per day
    );

    // Get the rewardPerToken immediately (current time is before periodFinish)
    const rewardPerTokenNow = await instance.rewardPerToken(await rewardToken.getAddress());

    // Fast forward time by 1 day (86400 seconds)
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine");

    // Get rewardPerToken after 1 day has passed
    const rewardPerTokenAfterDay = await instance.rewardPerToken(await rewardToken.getAddress());

    // In the original contract, rewardPerToken should increase because time has passed
    // In the mutant, _lastTimeRewardApplicable always returns periodFinish (7 days from now)
    // So rewardPerToken would calculate as if the full period has elapsed immediately
    // The difference between these two values should be significant in the original
    // but near zero in the mutant (since both calls return periodFinish)
    const difference = rewardPerTokenAfterDay - rewardPerTokenNow;

    // For the original contract, the difference should be positive and significant
    // For the mutant, the difference should be essentially zero
    // We assert the difference is > 0 to detect the mutant would fail
    expect(difference).to.be.gt(0);

    // Additional check: verify rewardPerToken is not already at its maximum
    // (mutant would return full period reward immediately)
    const expectedPerDay = ethers.parseEther("100"); // 700 / 7 = 100 tokens per day
    const expectedPerTokenPerDay = (expectedPerDay * ethers.parseEther("1")) / ethers.parseEther("100");
    expect(rewardPerTokenNow).to.be.lt(expectedPerTokenPerDay * 2n); // Should be less than 2 days worth
  });
});