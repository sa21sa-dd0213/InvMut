import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant detection - m24eb692f", function () {
  it("should detect mutant that subtracts leftover instead of adding it in _notifyReward", async function () {
    const [owner, distributor, staker] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a reward token
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();

    // Setup: owner adds reward token and sets distributor
    await instance.addReward(await rewardToken.getAddress());

    // Transfer reward tokens to distributor for funding
    await rewardToken.transfer(distributor.address, ethers.parseEther("10000"));
    await rewardToken.connect(distributor).approve(await instance.getAddress(), ethers.parseEther("10000"));

    // Staker stakes tokens
    await stakingToken.transfer(staker.address, ethers.parseEther("1000"));
    await stakingToken.connect(staker).approve(await instance.getAddress(), ethers.parseEther("1000"));
    await instance.connect(staker).stake(ethers.parseEther("1000"));

    // First reward notification: 7000 tokens over 7 days (rate = 1000 per day)
    const DURATION = 86400 * 7;
    await instance.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      ethers.parseEther("7000")
    );

    // Advance time by 3 days (leaving 4 days remaining)
    await ethers.provider.send("evm_increaseTime", [86400 * 3]);
    await ethers.provider.send("evm_mine");

    // Second reward notification: 7000 more tokens
    // Original: rate = (7000 + leftover) / DURATION where leftover = 4 days * 1000/day = 4000
    // Original expected rate: (7000 + 4000) / 7 = 1571.428... per day
    // Mutant rate: (7000 - 4000) / 7 = 428.571... per day
    await instance.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      ethers.parseEther("7000")
    );

    // Advance time to the end of the second period (7 more days from second notification)
    await ethers.provider.send("evm_increaseTime", [DURATION]);
    await ethers.provider.send("evm_mine");

    // Check claimable rewards for staker
    const earned = await instance.earned(staker.address, await rewardToken.getAddress());

    // With original: total rewards = 7000 + 7000 = 14000 tokens, all goes to single staker
    // With mutant: rewards would be significantly less due to subtraction

    // If mutant is active, earned will be less than expected 14000
    // The original should return exactly 14000 (all reward tokens distributed)
    expect(earned).to.equal(ethers.parseEther("14000"));

    // Claim rewards to verify
    await instance.connect(staker).getRewards(staker.address);

    // Check staker's balance of reward token
    const stakerBalance = await rewardToken.balanceOf(staker.address);
    expect(stakerBalance).to.equal(ethers.parseEther("14000"));
  });
});