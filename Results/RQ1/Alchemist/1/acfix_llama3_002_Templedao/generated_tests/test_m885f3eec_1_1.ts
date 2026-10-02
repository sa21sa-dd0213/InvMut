import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m885f3eec detection", function () {
  it("should detect mutant that reverses updateReward condition by verifying correct reward accrual after stake and claim", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Add reward token
    await instance.addReward(await rewardToken.getAddress());

    // Transfer staking tokens to user
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.transfer(user.address, stakeAmount);

    // User approves and stakes
    await stakingToken.connect(user).approve(await instance.getAddress(), stakeAmount);
    await instance.connect(user).stake(stakeAmount);

    // Distribute rewards as the rewardDistributor (owner)
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.approve(await instance.getAddress(), rewardAmount);
    await instance.notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);

    // Fast forward time to accrue rewards (past the 7 day period)
    await ethers.provider.send("evm_increaseTime", [86400 * 8]); // 8 days
    await ethers.provider.send("evm_mine", []);

    // Record user's reward token balance before claiming
    const balanceBefore = await rewardToken.balanceOf(user.address);

    // User withdraws all with claim = true
    await instance.connect(user).withdrawAll(true);

    // Record user's reward token balance after claiming
    const balanceAfter = await rewardToken.balanceOf(user.address);
    const claimedAmount = balanceAfter - balanceBefore;

    // Expected reward: rewardRate * duration = (1000 / 604800) * 604800 = 1000 tokens
    // But since staker has all the supply, they should get all rewards
    // With the mutant, the user's claimableRewards won't be updated properly during withdrawal
    // so they might claim 0 or incorrect amount
    const expectedReward = ethers.parseEther("1000");

    // In the original, user should receive the full reward
    // In the mutant, the condition is reversed so user's rewards won't be updated
    // causing them to claim 0 or wrong amount
    expect(claimedAmount).to.equal(expectedReward);
  });
});