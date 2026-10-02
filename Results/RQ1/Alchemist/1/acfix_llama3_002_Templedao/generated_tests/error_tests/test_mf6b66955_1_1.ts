import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant mf6b66955 (remove RewardPaid event)", function () {
  it("should emit RewardPaid event when claiming rewards after staking", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Add reward token
    await instance.addReward(await rewardToken.getAddress());

    // Fund user with staking tokens
    await stakingToken.transfer(user.address, ethers.parseEther("100"));

    // User stakes tokens
    await stakingToken.connect(user).approve(await instance.getAddress(), ethers.parseEther("100"));
    await instance.connect(user).stake(ethers.parseEther("10"));

    // Fund contract with rewards (simulate distributor)
    await rewardToken.transfer(owner.address, ethers.parseEther("1000"));
    await rewardToken.connect(owner).approve(await instance.getAddress(), ethers.parseEther("1000"));
    await instance.connect(owner).notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("100"));

    // Advance time to accrue rewards
    await ethers.provider.send("evm_increaseTime", [86400 * 7]); // One full duration
    await ethers.provider.send("evm_mine", []);

    // Claim rewards and check for RewardPaid event
    await expect(instance.connect(user).getRewards(user.address))
      .to.emit(instance, "RewardPaid")
      .withArgs(user.address, user.address, await rewardToken.getAddress(), ethers.parseEther("100"));
  });
});