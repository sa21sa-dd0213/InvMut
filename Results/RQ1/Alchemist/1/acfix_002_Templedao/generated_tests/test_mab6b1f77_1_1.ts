import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant mab6b1f77 - updateReward modifier removed from _withdrawFor", function () {
  it("should detect that partial withdrawal without updateReward causes incorrect reward calculation", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("ERC20Mock");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a reward token
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();

    // Setup: Add reward token and fund reward distributor
    await staking.addReward(await rewardToken.getAddress());

    // Transfer reward tokens to owner (who is also the reward distributor)
    await rewardToken.transfer(owner.address, ethers.parseEther("10000"));
    await rewardToken.connect(owner).approve(await staking.getAddress(), ethers.parseEther("10000"));

    // Notify reward amount - 1000 tokens over 1 week
    await staking.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("1000"));

    // User stakes tokens
    await stakingToken.transfer(user.address, ethers.parseEther("100"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("100"));
    await staking.connect(user).stake(ethers.parseEther("100"));

    // Fast forward time to accumulate rewards (half of the reward period)
    await ethers.provider.send("evm_increaseTime", [86400 * 3]); // 3 days
    await ethers.provider.send("evm_mine", []);

    // User partially withdraws - in the mutant, this won't update rewards
    await staking.connect(user).withdraw(ethers.parseEther("50"), false);

    // Check the user's claimable rewards after partial withdrawal
    // In original: rewards should be calculated correctly based on original stake
    // In mutant: rewards may be incorrect because updateReward wasn't called before balance change
    const claimableBefore = await staking.claimableRewards(user.address, await rewardToken.getAddress());

    // Fast forward more time
    await ethers.provider.send("evm_increaseTime", [86400 * 2]); // 2 more days
    await ethers.provider.send("evm_mine", []);

    // User claims rewards
    await staking.connect(user).getRewards(user.address);

    // Check reward token balance of user
    const userBalance = await rewardToken.balanceOf(user.address);

    // Calculate expected rewards for original contract:
    // First 3 days: 100 tokens staked * (1000/7 days) * 3 days / 1e18 = ~42.857 tokens
    // After partial withdrawal: 50 tokens staked for 2 days = ~14.286 tokens
    // Total expected: ~57.143 tokens

    // In mutant without updateReward, the calculation would be wrong
    // because _rewardPerToken and userRewardPerTokenPaid weren't updated
    // before the balance changed

    // The test should detect the mutant by checking that rewards are correct
    // In the original, rewards would be approximately correct
    // In the mutant, they would be significantly different

    // Expected minimum rewards (slightly less due to rounding)
    const expectedMinRewards = ethers.parseEther("57");
    const expectedMaxRewards = ethers.parseEther("58");

    // If the mutant is present, the rewards will likely be outside this range
    expect(userBalance).to.be.gte(expectedMinRewards);
    expect(userBalance).to.be.lte(expectedMaxRewards);
  });
});