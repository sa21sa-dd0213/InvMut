import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant mda1c31e6", function () {
  it("should detect mutant that modifies rewardPerTokenStored return when totalSupply is 0", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();

    // Add reward token
    await staking.addReward(await rewardToken.getAddress());

    // Transfer staking tokens to addr1 and approve
    await stakingToken.transfer(addr1.address, ethers.parseEther("100"));
    await stakingToken.connect(addr1).approve(await staking.getAddress(), ethers.parseEther("100"));

    // Transfer reward tokens to owner for distribution
    await rewardToken.transfer(owner.address, ethers.parseEther("1000"));
    await rewardToken.approve(await staking.getAddress(), ethers.parseEther("1000"));

    // Stake tokens
    await staking.connect(addr1).stake(ethers.parseEther("50"));

    // Notify reward
    await staking.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("100"));

    // Advance time to accrue some rewards
    await ethers.provider.send("evm_increaseTime", [86400 * 4]); // 4 days
    await ethers.provider.send("evm_mine", []);

    // Withdraw all tokens (making totalSupply = 0)
    await staking.connect(addr1).withdrawAll(true);

    // Now totalSupply is 0, check rewardPerToken - should return stored value, not 0
    const rewardPerTokenAfterWithdraw = await staking.rewardPerToken(await rewardToken.getAddress());

    // The stored rewardPerTokenStored should be greater than 0 since rewards were accrued
    expect(rewardPerTokenAfterWithdraw).to.be.gt(0);

    // If mutant returns 0 instead of stored value, this test will fail
    // Additional check: add new reward and verify it doesn't reset to 0
    await staking.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("50"));

    const rewardPerTokenAfterSecondNotify = await staking.rewardPerToken(await rewardToken.getAddress());

    // The value should still be > 0 (not reset to 0 by mutant)
    expect(rewardPerTokenAfterSecondNotify).to.be.gt(0);
  });
});