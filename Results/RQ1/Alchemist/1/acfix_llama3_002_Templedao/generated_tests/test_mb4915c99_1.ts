import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant mb4915c99 (replace / with + in _notifyReward)", function () {
  let stakingToken: any;
  let rewardToken: any;
  let staking: any;
  let owner: any;
  let user: any;
  let distributor: any;

  beforeEach(async function () {
    [owner, user, distributor] = await ethers.getSigners();

    // Deploy a simple ERC20 for staking token
    const ERC20Factory = await ethers.getContractFactory("TestERC20");
    stakingToken = await ERC20Factory.deploy("Staking Token", "STK");
    await stakingToken.waitForDeployment();

    // Deploy a simple ERC20 for reward token
    rewardToken = await ERC20Factory.deploy("Reward Token", "RWD");
    await rewardToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const StaxLPStakingFactory = await ethers.getContractFactory("StaxLPStaking");
    staking = await StaxLPStakingFactory.deploy(
      await stakingToken.getAddress(),
      distributor.address
    );
    await staking.waitForDeployment();

    // Transfer some tokens to user for staking
    await stakingToken.mint(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("1000"));

    // Transfer reward tokens to distributor
    await rewardToken.mint(distributor.address, ethers.parseEther("10000"));
    await rewardToken.connect(distributor).approve(await staking.getAddress(), ethers.parseEther("10000"));

    // Owner adds reward token
    await staking.connect(owner).addReward(await rewardToken.getAddress());
  });

  it("should kill mutant by detecting inflated rewards when notifying during active period", async function () {
    const DURATION = 86400 * 7; // 7 days in seconds

    // First reward notification - start a reward period
    const firstReward = ethers.parseEther("1000");
    await staking.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      firstReward
    );

    // User stakes tokens
    const stakeAmount = ethers.parseEther("100");
    await staking.connect(user).stake(stakeAmount);

    // Wait for some time into the first reward period (e.g., 1 day)
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);

    // Second reward notification while first period is still active
    const secondReward = ethers.parseEther("500");
    await staking.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      secondReward
    );

    // Wait for the remainder of the reward period
    await ethers.provider.send("evm_increaseTime", [86400 * 6]);
    await ethers.provider.send("evm_mine", []);

    // Get earned rewards
    const earned = await staking.connect(user).earned(user.address, await rewardToken.getAddress());

    // In the original contract, total rewards distributed = 1000 + 500 = 1500 tokens
    // User staked 100 out of 1000 total supply, so should earn ~150 tokens
    // In the mutant, the reward rate calculation is broken: (amount + leftover) + DURATION
    // This creates an enormously inflated rewardRate, causing earned rewards to be massively higher
    const maxExpected = ethers.parseEther("1600"); // generous upper bound for original
    const minExpected = ethers.parseEther("1400"); // reasonable lower bound for original

    // If mutant is present, earned will be astronomically larger than maxExpected
    // If original, earned will be within reasonable bounds
    expect(earned).to.be.lt(maxExpected);
    expect(earned).to.be.gt(minExpected);
  });
});