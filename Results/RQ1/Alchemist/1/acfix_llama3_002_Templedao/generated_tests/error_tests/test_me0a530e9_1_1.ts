import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - _lastTimeRewardApplicable", function () {
  it("should kill mutant by calling rewardPerToken during active reward period", async function () {
    const [owner, distributor, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), distributor.address);
    await staking.waitForDeployment();

    // Add reward token
    await staking.connect(owner).addReward(await rewardToken.getAddress());

    // Transfer some reward tokens to distributor and approve
    await rewardToken.transfer(distributor.address, ethers.parseEther("1000"));
    await rewardToken.connect(distributor).approve(await staking.getAddress(), ethers.parseEther("1000"));

    // Stake tokens first
    await stakingToken.transfer(user.address, ethers.parseEther("100"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("100"));
    await staking.connect(user).stake(ethers.parseEther("100"));

    // Notify reward - this sets periodFinish to block.timestamp + DURATION
    await staking.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      ethers.parseEther("700") // 700 tokens over 7 days = 100 tokens per day
    );

    // Fast forward 1 day (86400 seconds) to be in the middle of the reward period
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);

    // Now call rewardPerToken - this calls _lastTimeRewardApplicable internally
    // In the original, it returns block.timestamp (which is now > periodFinish start)
    // In the mutant, it returns 0, causing the rewardPerToken calculation to be wrong
    const rewardPerTokenValue = await staking.rewardPerToken(await rewardToken.getAddress());

    // If the mutant is active, rewardPerToken will be significantly lower than expected
    // because it used 0 instead of block.timestamp in the calculation
    // Expected: some positive value since rewards are accruing
    expect(rewardPerTokenValue).to.be.gt(0);

    // Additional check: earned() should also reflect the correct amount
    const earnedAmount = await staking.earned(user.address, await rewardToken.getAddress());
    expect(earnedAmount).to.be.gt(0);
  });
});