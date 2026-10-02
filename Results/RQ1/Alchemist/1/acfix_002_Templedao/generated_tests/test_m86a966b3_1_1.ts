import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - mutant m86a966b3", function () {
  it("should kill mutant by verifying rewards are claimed after staking and notifyRewardAmount", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Stake", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a mock reward token
    const rewardToken = await MockERC20.deploy("Reward", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();

    // Transfer staking tokens to user and approve
    await stakingToken.transfer(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("1000"));

    // Add reward token and fund reward distributor
    await staking.addReward(await rewardToken.getAddress());
    await rewardToken.transfer(owner.address, ethers.parseEther("100"));
    await rewardToken.connect(owner).approve(await staking.getAddress(), ethers.parseEther("100"));

    // Notify reward amount
    await staking.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("100"));

    // User stakes tokens
    await staking.connect(user).stake(ethers.parseEther("100"));

    // Fast forward time to accumulate rewards
    await ethers.provider.send("evm_increaseTime", [86400 * 7]); // One week (DURATION)
    await ethers.provider.send("evm_mine");

    // Get expected rewards before claiming
    const expectedRewards = await staking.earned(user.address, await rewardToken.getAddress());

    // Claim rewards
    await staking.connect(user).getRewards(user.address);

    // Check user balance of reward token after claim - should be > 0 in original, 0 in mutant
    const rewardBalance = await rewardToken.balanceOf(user.address);
    expect(rewardBalance).to.be.gt(0);
  });
});