import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant m8e91bcee (getReward missing updateReward modifier)", function () {
  let stakingToken: any;
  let rewardToken: any;
  let staking: any;
  let owner: any;
  let user: any;
  let distributor: any;
  const DURATION = 86400 * 7;

  beforeEach(async function () {
    [owner, user, distributor] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    stakingToken = await ERC20Factory.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    staking = await Factory.deploy(await stakingToken.getAddress(), await distributor.getAddress());
    await staking.waitForDeployment();

    // Transfer reward tokens to distributor and approve staking contract
    await rewardToken.transfer(await distributor.getAddress(), ethers.parseEther("1000"));
    await rewardToken.connect(distributor).approve(await staking.getAddress(), ethers.parseEther("1000"));

    // Transfer staking tokens to user and approve
    await stakingToken.transfer(await user.getAddress(), ethers.parseEther("100"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("100"));

    // Add reward token
    await staking.connect(owner).addReward(await rewardToken.getAddress());
  });

  it("should kill mutant by checking that getReward properly updates rewards before claiming", async function () {
    // User stakes tokens
    await staking.connect(user).stake(ethers.parseEther("10"));

    // Notify reward (distributor sends rewards)
    await staking.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      ethers.parseEther("700") // 700 tokens over 7 days = 100 per day
    );

    // Fast forward 3 days
    await ethers.provider.send("evm_increaseTime", [86400 * 3]);
    await ethers.provider.send("evm_mine", []);

    // Record user's reward token balance before claiming
    const balanceBefore = await rewardToken.balanceOf(await user.getAddress());

    // User claims reward for specific token using getReward
    await staking.connect(user).getReward(await user.getAddress(), await rewardToken.getAddress());

    // Record balance after claiming
    const balanceAfter = await rewardToken.balanceOf(await user.getAddress());
    const rewardClaimed = balanceAfter - balanceBefore;

    // The expected reward after 3 days: (10 / totalSupply) * rewardRate * time
    // totalSupply = 10, rewardRate = 100 per day = 100e18 per day in wei
    // rewardPerToken increase = (3 days * 100e18 * 1e18) / 10e18 = 30e18
    // user earned = (10e18 * 30e18) / 1e18 = 300e18 = 300 tokens
    const expectedReward = ethers.parseEther("300");

    // On the original contract, rewardClaimed should be ~300 tokens
    // On the mutant (without updateReward modifier), rewardClaimed will be 0 or incorrect
    // because claimableRewards wasn't updated before claiming
    expect(rewardClaimed).to.equal(expectedReward);
  });
});