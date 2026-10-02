import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant mb3f402d3 (loop condition changed from < to >)", function () {
  it("should accumulate rewards after staking and waiting for reward period; mutant never updates rewards due to broken loop", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy mock ERC20 tokens for staking and rewards
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();

    // Add reward token
    await staking.addReward(await rewardToken.getAddress());

    // Transfer staking tokens to user and approve
    await stakingToken.transfer(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("1000"));

    // User stakes tokens
    await staking.connect(user).stake(ethers.parseEther("100"));

    // Owner notifies reward (as rewardDistributor)
    await rewardToken.approve(await staking.getAddress(), ethers.parseEther("1000"));
    await staking.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("700")); // 700 tokens over 7 days

    // Advance time to after reward period ends
    await ethers.provider.send("evm_increaseTime", [86400 * 7 + 1]);
    await ethers.provider.send("evm_mine", []);

    // Get claimable rewards before any claim
    const claimableBefore = await staking.earned(user.address, await rewardToken.getAddress());

    // On original contract, rewards should have accumulated
    // On mutant, rewards will be 0 because updateReward loop never executes
    expect(claimableBefore).to.be.gt(0);
  });
});