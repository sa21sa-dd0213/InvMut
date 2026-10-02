import { expect } from "chai";
import { ethers } } from "hardhat";

describe("StaxLPStaking mutant m81034f15 - division instead of subtraction in _earned", function () {
  let stakingToken: any;
  let rewardToken: any;
  let staking: any;
  let owner: any;
  let user: any;
  let rewardDistributor: any;

  beforeEach(async function () {
    [owner, user, rewardDistributor] = await ethers.getSigners();

    // Deploy a simple ERC20 for staking token and reward token
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    stakingToken = await ERC20Factory.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();

    rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    staking = await Factory.deploy(
      await stakingToken.getAddress(),
      await rewardDistributor.getAddress()
    );
    await staking.waitForDeployment();

    // Mint tokens to user for staking
    await stakingToken.mint(await user.getAddress(), ethers.parseEther("1000"));
    // Mint reward tokens to rewardDistributor
    await rewardToken.mint(await rewardDistributor.getAddress(), ethers.parseEther("1000"));
    // Approve staking contract to spend user's tokens
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("1000"));
    // Approve staking contract to spend reward distributor's tokens
    await rewardToken.connect(rewardDistributor).approve(await staking.getAddress(), ethers.parseEther("1000"));

    // Add reward token to staking contract (only owner)
    await staking.connect(owner).addReward(await rewardToken.getAddress());

    // Notify reward (as rewardDistributor)
    await staking.connect(rewardDistributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      ethers.parseEther("700") // 700 tokens over 7 days = 100 tokens per day
    );
  });

  it("should detect mutant where division replaces subtraction in _earned calculation", async function () {
    // User stakes tokens
    const stakeAmount = ethers.parseEther("100");
    await staking.connect(user).stake(stakeAmount);

    // Fast forward time to accumulate some rewards (e.g., 1 day)
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);

    // Get the earned rewards for user
    const earned = await staking.connect(user).earned(
      await user.getAddress(),
      await rewardToken.getAddress()
    );

    // Expected calculation:
    // rewardPerToken = (timeDelta * rewardRate * 1e18) / totalSupply
    // rewardRate = 700e18 / 604800 = ~1.157e15 per second
    // For 1 day (86400 seconds): rewardPerToken increase = (86400 * 1.157e15 * 1e18) / 100e18
    // = (86400 * 1.157e15 * 1e18) / 100e18
    // = 86400 * 1.157e15 / 100
    // = ~1e18
    // userRewardPerTokenPaid = 0 initially
    // earned = (100e18 * (rewardPerToken - 0)) / 1e18 + 0
    // = 100e18 * rewardPerToken / 1e18
    // = 100 * rewardPerToken

    // Calculate expected rewardPerToken manually
    const totalSupply = await staking.totalSupply();
    const rewardData = await staking.rewardData(await rewardToken.getAddress());
    const periodFinish = rewardData.periodFinish;
    const lastUpdateTime = rewardData.lastUpdateTime;
    const rewardRate = rewardData.rewardRate;
    const rewardPerTokenStored = rewardData.rewardPerTokenStored;

    const timeDelta = BigInt(86400); // 1 day
    const rewardPerTokenIncrease = (timeDelta * BigInt(rewardRate) * ethers.parseEther("1")) / BigInt(totalSupply);
    const expectedRewardPerToken = BigInt(rewardPerTokenStored) + rewardPerTokenIncrease;
    const expectedEarned = (stakeAmount * expectedRewardPerToken) / ethers.parseEther("1");

    // The mutant calculates (balance * (rewardPerToken / userRewardPerTokenPaid)) / 1e18
    // Since userRewardPerTokenPaid is 0, this would cause a division by zero revert
    // If it doesn't revert, the result would be completely different

    // Assert that earned is as expected (original behavior)
    expect(earned).to.equal(expectedEarned);
  });
});