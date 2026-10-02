import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m1b3d474b (_getReward > replaced with >=)", function () {
  it("should NOT emit RewardPaid when claimable rewards are zero (original behavior with > 0)", async function () {
    const [owner, staker] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Stake Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a mock reward token
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Add reward token
    await instance.addReward(await rewardToken.getAddress());

    // Transfer staking tokens to staker and stake
    await stakingToken.transfer(staker.address, ethers.parseEther("100"));
    await stakingToken.connect(staker).approve(await instance.getAddress(), ethers.parseEther("100"));
    await instance.connect(staker).stake(ethers.parseEther("10"));

    // Fund reward distributor and notify reward (so rewardToken is recognized)
    await rewardToken.transfer(owner.address, ethers.parseEther("1000"));
    await rewardToken.approve(await instance.getAddress(), ethers.parseEther("1000"));
    await instance.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("1000"));

    // Advance time past the reward period to ensure rewards are fully calculated
    await ethers.provider.send("evm_increaseTime", [86400 * 7 + 1]);
    await ethers.provider.send("evm_mine", []);

    // Now claim rewards - they should be non-zero, but we want to test zero case
    // First claim all rewards to zero them out
    await instance.connect(staker).getRewards(staker.address);

    // Verify claimable rewards are now zero
    const claimable = await instance.claimableRewards(staker.address, await rewardToken.getAddress());
    expect(claimable).to.equal(0n);

    // Now call getReward again - this should NOT emit RewardPaid in original code
    // because amount == 0, so the if(amount > 0) check fails
    // In the mutant with if(amount >= 0), it will emit RewardPaid

    // Check that no RewardPaid event is emitted
    await expect(
      instance.connect(staker).getReward(staker.address, await rewardToken.getAddress())
    ).to.not.emit(instance, "RewardPaid");
  });
});