import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - m0e9a4438", function () {
  it("should kill the mutant that replaces + with * in _rewardPerToken", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a mock reward token
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Add reward token
    await instance.addReward(await rewardToken.getAddress());

    // Fund user with staking tokens and approve
    await stakingToken.transfer(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // User stakes tokens
    await instance.connect(user).stake(ethers.parseEther("100"));

    // Owner funds rewards and notifies
    await rewardToken.transfer(owner.address, ethers.parseEther("1000"));
    await rewardToken.approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Notify reward of 100 tokens over DURATION (7 days)
    await instance.connect(owner).notifyRewardAmount(
      await rewardToken.getAddress(),
      ethers.parseEther("100")
    );

    // Advance time by 1 day (86400 seconds) to accrue some rewards
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);

    // Get reward per token after 1 day
    const rptAfter1Day = await instance.rewardPerToken(await rewardToken.getAddress());

    // Advance time by another day
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine", []);

    const rptAfter2Days = await instance.rewardPerToken(await rewardToken.getAddress());

    // Calculate ratio using BigInt arithmetic
    const ratio = (rptAfter2Days * BigInt(1e18)) / rptAfter1Day;

    // Ratio should be approximately 2 (for original with linear addition)
    // For mutant with multiplication, ratio would be huge (exponential)
    expect(ratio).to.be.closeTo(
      ethers.parseEther("2"),
      ethers.parseEther("0.5") // Allow some tolerance for rounding
    );

    // Additionally, check that rewards earned are reasonable
    const earned = await instance.earned(user.address, await rewardToken.getAddress());
    // Earned should be > 0 and less than the total notified reward
    expect(earned).to.be.gt(0);
    expect(earned).to.be.lt(ethers.parseEther("100"));
  });
});