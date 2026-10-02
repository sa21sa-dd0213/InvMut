import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant me0a530e9", function () {
  it("should correctly calculate rewardPerToken using current block timestamp during active reward period", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock ERC20 for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 for rewards
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking with required constructor args
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Add reward token
    await instance.connect(owner).addReward(await rewardToken.getAddress());

    // User stakes tokens
    await stakingToken.connect(owner).transfer(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await instance.getAddress(), ethers.parseEther("1000"));
    await instance.connect(user).stake(ethers.parseEther("100"));

    // Owner sends reward tokens to the contract
    await rewardToken.connect(owner).transfer(await instance.getAddress(), ethers.parseEther("1000"));

    // Notify reward - this sets periodFinish to block.timestamp + DURATION
    await instance.connect(owner).notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("1000"));

    // Get periodFinish from the contract
    const periodFinish = await instance.rewardPeriodFinish(await rewardToken.getAddress());

    // Advance time to be within the active reward period (before periodFinish)
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(periodFinish) - 1000]);
    await ethers.provider.send("evm_mine", []);

    // Now call rewardPerToken while the period is still active
    // The mutant will return 0 instead of block.timestamp in _lastTimeRewardApplicable
    // This will make rewardPerToken calculation incorrect
    const rewardPerToken = await instance.rewardPerToken(await rewardToken.getAddress());

    // In the original contract, rewardPerToken should be > 0 because we're in an active period
    // The mutant would return 0 or a much smaller value
    expect(rewardPerToken).to.be.gt(0);

    // Additionally, verify that earned() also uses the correct calculation
    const earnedAmount = await instance.earned(user.address, await rewardToken.getAddress());
    expect(earnedAmount).to.be.gt(0);
  });
});