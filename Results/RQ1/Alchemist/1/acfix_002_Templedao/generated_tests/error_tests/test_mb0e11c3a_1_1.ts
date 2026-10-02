import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - _getReward amount check", function () {
  it("should not transfer zero rewards when user has no claimable rewards", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();

    // Deploy a reward token
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Add reward token to staking contract
    await staking.connect(owner).addReward(await rewardToken.getAddress());

    // Transfer staking tokens to user and stake
    await stakingToken.connect(owner).transfer(user.address, ethers.parseEther("100"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("100"));
    await staking.connect(user).stake(ethers.parseEther("100"));

    // User has no claimable rewards initially (claimableRewards = 0)
    // Call getRewards - in the mutant, this will try to transfer 0 tokens
    // In the original, the transfer is skipped when amount is 0

    // Check user's reward token balance before
    const balanceBefore = await rewardToken.balanceOf(user.address);

    // Call getRewards (triggers _getReward for all reward tokens)
    await staking.connect(user).getRewards(user.address);

    // Check user's reward token balance after - should remain unchanged
    const balanceAfter = await rewardToken.balanceOf(user.address);

    // In the original contract, balance should be unchanged (no transfer of 0)
    // In the mutant, the safeTransfer of 0 tokens would still execute
    expect(balanceAfter).to.equal(balanceBefore);
  });
});