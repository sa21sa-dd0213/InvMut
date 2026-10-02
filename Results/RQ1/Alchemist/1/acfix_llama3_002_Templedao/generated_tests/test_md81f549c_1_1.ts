import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant md81f549c - kill earned function", function () {
  it("should kill mutant by calling earned() after staking and expecting non-zero reward value", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a mock reward token
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const instance = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Add reward token
    await instance.addReward(await rewardToken.getAddress());

    // Transfer staking tokens to addr1 and approve
    await stakingToken.transfer(addr1.address, ethers.parseEther("1000"));
    await stakingToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Stake tokens
    await instance.connect(addr1).stake(ethers.parseEther("100"));

    // Transfer reward tokens to owner and notify reward
    await rewardToken.transfer(owner.address, ethers.parseEther("1000"));
    await rewardToken.connect(owner).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Notify reward amount
    await instance.connect(owner).notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("100"));

    // Fast forward time to accumulate rewards
    await ethers.provider.send("evm_increaseTime", [86400 * 7]); // 1 week
    await ethers.provider.send("evm_mine", []);

    // Call earned() - should return non-zero value after rewards have accumulated
    const earnedAmount = await instance.connect(addr1).earned(addr1.address, await rewardToken.getAddress());

    // The mutant returns 0 instead of the actual earned amount
    // In the original contract, this should be > 0
    expect(earnedAmount).to.be.gt(0);
  });
});