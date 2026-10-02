import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m86a966b3", function () {
  it("should kill the mutant by verifying reward distribution after staking", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("ERC20Mock");
    const stakingToken = await MockToken.deploy("Stake", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a mock reward token
    const rewardToken = await MockToken.deploy("Reward", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();

    // Add reward token
    await staking.connect(owner).addReward(await rewardToken.getAddress());

    // Transfer staking tokens to user
    await stakingToken.transfer(user.address, ethers.parseEther("1000"));

    // User stakes tokens
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("1000"));
    await staking.connect(user).stake(ethers.parseEther("1000"));

    // Transfer reward tokens to owner (who is the reward distributor)
    await rewardToken.transfer(owner.address, ethers.parseEther("100"));

    // Notify reward amount (1 reward token per second for 7 days = 604800 tokens)
    await rewardToken.connect(owner).approve(await staking.getAddress(), ethers.parseEther("100"));
    await staking.connect(owner).notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("100"));

    // Fast forward time to allow rewards to accumulate
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine", []);

    // Get expected reward before claiming
    const expectedReward = await staking.earned(user.address, await rewardToken.getAddress());

    // User claims rewards
    await staking.connect(user).getRewards(user.address);

    // Check that user actually received the rewards
    const userBalance = await rewardToken.balanceOf(user.address);
    expect(userBalance).to.equal(expectedReward);
    expect(userBalance).to.be.gt(0); // Ensure rewards were actually transferred

    // If the mutant is present (loop condition i > rewardTokens.length), 
    // the loop in _getRewards never executes and no rewards are transferred,
    // so this assertion will fail, killing the mutant
  });
});