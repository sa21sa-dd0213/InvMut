import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant mf3b7c985 (_earned division replaced with addition)", function () {
  let stakingToken: any;
  let rewardToken: any;
  let staking: any;
  let owner: any;
  let user: any;
  let distributor: any;

  beforeEach(async function () {
    [owner, user, distributor] = await ethers.getSigners();

    // Deploy a simple ERC20 for staking token
    const ERC20Factory = await ethers.getContractFactory("ERC20PresetMinterPauser");
    stakingToken = await ERC20Factory.deploy("Staking Token", "STK");
    await stakingToken.waitForDeployment();

    // Deploy a simple ERC20 for reward token
    rewardToken = await ERC20Factory.deploy("Reward Token", "RWD");
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking with staking token and distributor
    const StaxLPStakingFactory = await ethers.getContractFactory("StaxLPStaking");
    staking = await StaxLPStakingFactory.deploy(
      await stakingToken.getAddress(),
      distributor.address
    );
    await staking.waitForDeployment();

    // Mint staking tokens to user
    const mintAmount = ethers.parseEther("1000");
    await stakingToken.mint(user.address, mintAmount);
    await stakingToken.connect(user).approve(await staking.getAddress(), mintAmount);

    // Mint reward tokens to distributor and approve
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.mint(distributor.address, rewardAmount);
    await rewardToken.connect(distributor).approve(await staking.getAddress(), rewardAmount);

    // Add reward token and notify reward amount
    await staking.connect(owner).addReward(await rewardToken.getAddress());
    await staking.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      rewardAmount
    );
  });

  it("should detect the mutant by verifying earned rewards are correctly calculated after staking and time passage", async function () {
    // User stakes 100 tokens
    const stakeAmount = ethers.parseEther("100");
    await staking.connect(user).stake(stakeAmount);

    // Fast forward time to accumulate rewards (1 week = DURATION)
    const DURATION = 86400 * 7; // 7 days
    await ethers.provider.send("evm_increaseTime", [DURATION]);
    await ethers.provider.send("evm_mine", []);

    // Calculate expected reward manually:
    // rewardRate = rewardAmount / DURATION = 1000e18 / 604800 ≈ 1.652e15
    // For 100 tokens staked for full duration:
    // earned = (balance * (rewardPerToken - userRewardPerTokenPaid)) / 1e18
    // rewardPerToken = (timeElapsed * rewardRate * 1e18) / totalSupply
    // = (604800 * (1000e18/604800) * 1e18) / 100e18 = (1000e18 * 1e18) / 100e18 = 10e18
    // earned = (100e18 * (10e18 - 0)) / 1e18 = 100e18 * 10 = 1000e18

    const expectedEarned = ethers.parseEther("1000");

    // Get actual earned from contract
    const actualEarned = await staking.earned(user.address, await rewardToken.getAddress());

    // The mutant would compute: (balance * (rewardPerToken - userRewardPerTokenPaid)) + 1e18
    // = (100e18 * 10e18) + 1e18 = 1000e36 + 1e18 which is vastly different from 1000e18
    // Original should return exactly expectedEarned
    expect(actualEarned).to.equal(expectedEarned);
  });
});