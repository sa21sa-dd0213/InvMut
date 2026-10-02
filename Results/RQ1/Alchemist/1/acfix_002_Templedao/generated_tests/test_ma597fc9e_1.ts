import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant test - _rewardPerToken subtraction bug", function () {
  let stakingToken: any;
  let rewardToken: any;
  let staking: any;
  let owner: any;
  let user: any;
  let distributor: any;
  const DURATION = 86400 * 7;
  const REWARD_AMOUNT = ethers.parseEther("1000");
  const STAKE_AMOUNT = ethers.parseEther("100");

  beforeEach(async function () {
    [owner, user, distributor] = await ethers.getSigners();

    // Deploy a simple ERC20 for staking token and reward token
    const ERC20Factory = await ethers.getContractFactory("contracts/test/ERC20Mock.sol:ERC20Mock");
    stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("10000"));
    rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", ethers.parseEther("10000"));
    await stakingToken.waitForDeployment();
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking with the staking token and distributor
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    staking = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await staking.waitForDeployment();

    // Transfer tokens to user for staking and to distributor for rewards
    await stakingToken.transfer(user.address, STAKE_AMOUNT);
    await rewardToken.transfer(distributor.address, REWARD_AMOUNT);

    // Setup reward token in the staking contract
    await staking.connect(owner).addReward(await rewardToken.getAddress());
  });

  it("should compute correct rewards after staking and time passes - kills mutant that subtracts instead of adds", async function () {
    // User stakes tokens
    await stakingToken.connect(user).approve(await staking.getAddress(), STAKE_AMOUNT);
    await staking.connect(user).stake(STAKE_AMOUNT);

    // Distributor notifies reward
    await rewardToken.connect(distributor).approve(await staking.getAddress(), REWARD_AMOUNT);
    await staking.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), REWARD_AMOUNT);

    // Fast forward half the reward duration
    await ethers.provider.send("evm_increaseTime", [DURATION / 2]);
    await ethers.provider.send("evm_mine", []);

    // Check earned rewards for user - should be positive (half of reward since staked entire time)
    const earned = await staking.connect(user).earned(user.address, await rewardToken.getAddress());

    // With correct calculation: earned = (balance * (rewardPerToken - userRewardPerTokenPaid)) / 1e18 + claimable
    // After half duration: rewardPerTokenStored = 0 + ((DURATION/2) * rewardRate * 1e18) / totalSupply
    // rewardRate = REWARD_AMOUNT / DURATION
    // Expected reward for user = (STAKE_AMOUNT * (half reward per token)) / 1e18 = REWARD_AMOUNT * (DURATION/2) / DURATION = REWARD_AMOUNT / 2
    const expectedReward = REWARD_AMOUNT / 2n;

    // In the mutant, subtraction would give negative or zero, so we expect a revert or zero
    // The test should detect the mutant by checking that earned is NOT zero and matches expected
    expect(earned).to.be.gt(0);
    expect(earned).to.equal(expectedReward);
  });
});