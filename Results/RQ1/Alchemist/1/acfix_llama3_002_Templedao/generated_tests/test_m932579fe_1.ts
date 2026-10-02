import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant m932579fe (exponentiation instead of multiplication)", function () {
  it("should compute correct rewards with multiplication, not exponentiation", async function () {
    const [owner, staker] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const StakingTokenFactory = await ethers.getContractFactory("ERC20Mock");
    const stakingToken = await StakingTokenFactory.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 token for rewards
    const RewardTokenFactory = await ethers.getContractFactory("ERC20Mock");
    const rewardToken = await RewardTokenFactory.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const StaxLPStakingFactory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStakingFactory.deploy(
      await stakingToken.getAddress(),
      owner.address
    );
    await staking.waitForDeployment();

    // Add reward token
    await staking.addReward(await rewardToken.getAddress());

    // Fund staker with staking tokens
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.mint(staker.address, stakeAmount);
    await stakingToken.connect(staker).approve(await staking.getAddress(), stakeAmount);

    // Staker stakes tokens
    await staking.connect(staker).stake(stakeAmount);

    // Notify a reward of exactly 1e18 wei over one week (DURATION = 604800 seconds)
    const rewardAmount = ethers.parseEther("1");
    await rewardToken.mint(owner.address, rewardAmount);
    await rewardToken.connect(owner).approve(await staking.getAddress(), rewardAmount);
    await staking.notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);

    // Fast forward half the reward period (302400 seconds)
    await ethers.provider.send("evm_increaseTime", [302400]);
    await ethers.provider.send("evm_mine", []);

    // Check earned rewards for the staker
    // In the original: rewardRate = 1e18 / 604800 ≈ 1653.44 wei per second
    // After 302400 seconds: rewardPerTokenStored ≈ (302400 * 1653.44 * 1e18) / 100e18 ≈ 5e17 (0.5 tokens)
    // With exponentiation: rewardRate ** 1e18 would overflow or produce an astronomically large number
    const earned = await staking.earned(staker.address, await rewardToken.getAddress());
    
    // Expected: roughly 0.5 * 1e18 = 5e17 (half of the reward since half the period passed)
    // With exponentiation, the value would be impossibly huge (overflow or > 1e100)
    expect(earned).to.be.lessThan(ethers.parseEther("100")); // Sanity check: not astronomically large
    expect(earned).to.be.greaterThan(ethers.parseEther("0.4")); // Reasonable range
    expect(earned).to.be.lessThan(ethers.parseEther("0.6")); // Reasonable range

    // Also verify that claim works correctly with reasonable reward
    await staking.connect(staker).getRewards(staker.address);
    const rewardBalance = await rewardToken.balanceOf(staker.address);
    expect(rewardBalance).to.equal(earned);
    expect(rewardBalance).to.be.lessThan(ethers.parseEther("100"));
  });
});