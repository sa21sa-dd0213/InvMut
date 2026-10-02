import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - rewardPerToken exponentiation bug", function () {
  it("should detect that exponentiation instead of multiplication in _rewardPerToken produces incorrect reward calculations", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock ERC20 for staking token and reward token
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    const rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking with required constructor arguments
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Setup: user stakes tokens
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.transfer(user.address, stakeAmount);
    await stakingToken.connect(user).approve(await instance.getAddress(), stakeAmount);
    await instance.connect(user).stake(stakeAmount);

    // Add reward token and notify reward
    await instance.addReward(await rewardToken.getAddress());

    // Transfer reward tokens to owner to distribute
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.transfer(owner.address, rewardAmount);
    await rewardToken.connect(owner).approve(await instance.getAddress(), rewardAmount);

    // Notify reward - this sets rewardRate = rewardAmount / DURATION (7 days)
    await instance.connect(owner).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);

    // Fast forward time to accumulate some rewards (e.g., 1 day)
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);

    // Get the reward per token
    const rewardPerToken = await instance.rewardPerToken(await rewardToken.getAddress());

    // Get earned rewards for the user
    const earnedRewards = await instance.earned(user.address, await rewardToken.getAddress());

    // A reasonable rewardPerToken after 1 day with 1000 tokens distributed over 7 days for 100 staked
    // Should be in the range of 0.1 to 100 tokens worth (1e17 to 1e20 wei)
    expect(rewardPerToken).to.be.lessThan(ethers.parseEther("1000000"));
    expect(rewardPerToken).to.be.greaterThan(0);

    // Earned rewards should also be reasonable
    expect(earnedRewards).to.be.lessThan(ethers.parseEther("1000000"));

    // The key assertion: if the mutant is present, the rewardPerToken will be either extremely large (>1e50) or cause overflow
    // We can also check that rewardPerToken is not astronomically large
    expect(rewardPerToken).to.be.lessThan(ethers.parseEther("1000000000"));
  });
});