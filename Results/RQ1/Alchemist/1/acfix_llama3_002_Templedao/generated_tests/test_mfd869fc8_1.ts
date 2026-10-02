import { expect } from "chai";
import { ethers } } from "hardhat";

describe("StaxLPStaking mutant detection - _lastTimeRewardApplicable", function () {
  let stakingToken: any;
  let rewardToken: any;
  let staking: any;
  let owner: any;
  let user: any;
  const DURATION = 86400 * 7; // 7 days

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    stakingToken = await ERC20Factory.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    staking = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();

    // Setup reward token
    await staking.connect(owner).addReward(await rewardToken.getAddress());

    // Transfer tokens and approve
    await stakingToken.transfer(user.address, ethers.parseEther("100"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("100"));
    await rewardToken.transfer(owner.address, ethers.parseEther("1000"));
    await rewardToken.approve(await staking.getAddress(), ethers.parseEther("1000"));
  });

  it("should detect mutant by checking rewards stop accruing after period finish", async function () {
    // User stakes tokens
    await staking.connect(user).stake(ethers.parseEther("10"));

    // Owner notifies reward
    const rewardAmount = ethers.parseEther("100");
    await staking.connect(owner).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);

    // Fast forward to just before period ends
    const periodFinish = await staking.rewardPeriodFinish(await rewardToken.getAddress());
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(periodFinish) - 1]);
    await ethers.provider.send("evm_mine", []);

    // Record earned amount just before period ends
    const earnedBefore = await staking.earned(user.address, await rewardToken.getAddress());

    // Fast forward past period finish
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(periodFinish) + 3600]); // 1 hour after
    await ethers.provider.send("evm_mine", []);

    // Record earned amount after period ends
    const earnedAfter = await staking.earned(user.address, await rewardToken.getAddress());

    // In the original contract, rewards should stop accruing after period finish
    // In the mutant, rewards would continue to increase (killing the test)
    expect(earnedAfter).to.equal(earnedBefore);
  });
});