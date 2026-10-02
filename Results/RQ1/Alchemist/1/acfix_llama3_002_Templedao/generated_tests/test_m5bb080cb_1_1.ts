import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test", function () {
  it("should kill mutant m5bb080cb by causing underflow when notifying reward smaller than DURATION during active reward period", async function () {
    const [owner, distributor, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 token for rewards
    const rewardToken = await ethers.getContractFactory("MockERC20");
    const rewardTokenInstance = await rewardToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardTokenInstance.waitForDeployment();

    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();

    // Setup: Add reward token and set reward distributor
    await instance.connect(owner).addReward(await rewardTokenInstance.getAddress());

    // User stakes some tokens first
    await stakingToken.connect(user).approve(await instance.getAddress(), ethers.parseEther("100"));
    await instance.connect(user).stake(ethers.parseEther("10"));

    // First notification: large reward to start a reward period
    const largeReward = ethers.parseEther("1000");
    await rewardTokenInstance.connect(distributor).approve(await instance.getAddress(), largeReward);
    await instance.connect(distributor).notifyRewardAmount(await rewardTokenInstance.getAddress(), largeReward);

    // Wait for some time to pass but not complete the reward period (DURATION = 604800 seconds)
    await ethers.provider.send("evm_increaseTime", [100]); // 100 seconds
    await ethers.provider.send("evm_mine", []);

    // Second notification with amount SMALLER than DURATION (604800)
    // This should trigger the else branch in _notifyReward where the mutant has subtraction
    const smallReward = ethers.parseEther("500"); // 500 < 604800
    await rewardTokenInstance.connect(distributor).approve(await instance.getAddress(), smallReward);

    // This should revert in the mutant due to underflow (500 + leftover - 604800)
    // but should succeed in the original contract
    await expect(
      instance.connect(distributor).notifyRewardAmount(await rewardTokenInstance.getAddress(), smallReward)
    ).to.be.reverted;
  });
});