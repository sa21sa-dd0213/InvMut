import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant test - updateReward loop condition", function () {
  it("should detect mutant by verifying reward updates after staking", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockTokenFactory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockTokenFactory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a reward token
    const rewardToken = await MockTokenFactory.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const StaxLPStakingFactory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await StaxLPStakingFactory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Setup: Add reward token and fund rewards
    await instance.addReward(await rewardToken.getAddress());

    // Fund reward distributor (owner) with reward tokens and notify reward
    await rewardToken.approve(await instance.getAddress(), ethers.parseEther("1000"));
    await instance.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("1000"));

    // User stakes tokens
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.transfer(user.address, stakeAmount);
    await stakingToken.connect(user).approve(await instance.getAddress(), stakeAmount);
    await instance.connect(user).stake(stakeAmount);

    // Fast forward time to accumulate rewards
    await ethers.provider.send("evm_increaseTime", [86400 * 7]); // One full period
    await ethers.provider.send("evm_mine", []);

    // Check earned rewards - should be non-zero if loop executed correctly
    const earned = await instance.earned(user.address, await rewardToken.getAddress());

    // The mutant prevents loop execution so rewardPerTokenStored never updates
    // This means earned() will return 0 (or very small due to claimableRewards)
    // Original would return non-zero rewards
    expect(earned).to.be.gt(0, "Earned rewards should be non-zero if updateReward works correctly");
  });
});