import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant mf3b7c985 - _earned division replaced with addition", function () {
  it("should kill the mutant by verifying earned rewards are correctly calculated after staking and notifying rewards", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock ERC20 for staking token
    const ERC20Factory = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 for reward token
    const rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const StakingFactory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StakingFactory.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();

    // Add reward token
    await staking.addReward(await rewardToken.getAddress());

    // Mint staking tokens to user and approve
    await stakingToken.mint(user.address, ethers.parseEther("100"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("100"));

    // User stakes 1 wei (very small amount)
    const stakeAmount = 1n;
    await staking.connect(user).stake(stakeAmount);

    // Notify a reward (1 token = 1e18 wei) from owner as distributor
    await rewardToken.mint(owner.address, ethers.parseEther("1"));
    await rewardToken.approve(await staking.getAddress(), ethers.parseEther("1"));
    await staking.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("1"));

    // Fast forward time to after reward period ends
    const DURATION = 86400 * 7; // 7 days
    await ethers.provider.send("evm_increaseTime", [DURATION + 1]);
    await ethers.provider.send("evm_mine", []);

    // Check earned rewards
    const earned = await staking.earned(user.address, await rewardToken.getAddress());

    // In the original contract: (balance * (rewardPerToken - userRewardPerTokenPaid)) / 1e18 + claimableRewards
    // With 1 wei staked and full reward period, rewardPerToken = (DURATION * rewardRate * 1e18) / totalSupply
    // rewardRate = 1e18 / DURATION, so rewardPerToken = 1e18
    // userRewardPerTokenPaid starts at 0, balance = 1
    // Original: (1 * (1e18 - 0)) / 1e18 + 0 = 1 wei
    // Mutant: (1 * (1e18 - 0)) + 1e18 + 0 = 2e18 (completely wrong)
    
    // The mutant would return ~2e18 instead of 1 wei
    expect(earned).to.equal(1n); // 1 wei is the correct reward for staking 1 wei
  });
});