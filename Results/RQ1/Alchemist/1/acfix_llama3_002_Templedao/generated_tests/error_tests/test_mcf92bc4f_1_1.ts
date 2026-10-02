import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - mcf92bc4f", function () {
  it("should kill mutant by verifying reward accounting is updated on stake", async function () {
    const [owner, staker] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("ERC20Mock");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a reward token
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Add reward token
    await instance.addReward(await rewardToken.getAddress());

    // Fund the staker with staking tokens
    await stakingToken.transfer(staker.address, ethers.parseEther("1000"));

    // Staker approves the staking contract
    await stakingToken.connect(staker).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Owner sends rewards to the contract and notifies
    await rewardToken.transfer(owner.address, ethers.parseEther("10000"));
    await rewardToken.approve(await instance.getAddress(), ethers.parseEther("10000"));

    // Notify reward amount
    const rewardAmount = ethers.parseEther("1000");
    await instance.notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);

    // Record initial claimable rewards for staker
    const initialClaimable = await instance.claimableRewards(staker.address, await rewardToken.getAddress());

    // Staker stakes tokens
    const stakeAmount = ethers.parseEther("100");
    await instance.connect(staker).stake(stakeAmount);

    // Advance time to accumulate rewards
    await ethers.provider.send("evm_increaseTime", [86400 * 7]); // One full duration
    await ethers.provider.send("evm_mine", []);

    // Check that claimable rewards have been updated (should be > 0 after staking and time passing)
    const claimableAfter = await instance.claimableRewards(staker.address, await rewardToken.getAddress());

    // If the mutant is present (updateReward removed), the claimable rewards won't be properly updated
    // and will remain at initial value (0), killing the mutant
    expect(claimableAfter).to.be.gt(initialClaimable);
  });
});