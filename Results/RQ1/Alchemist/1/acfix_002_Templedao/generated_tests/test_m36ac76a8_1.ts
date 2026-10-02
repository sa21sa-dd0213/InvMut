import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant m36ac76a8 (multiplication replaced with addition in _rewardPerToken)", function () {
  it("should compute correct reward per token using multiplication, not addition", async function () {
    const [owner, staker] = await ethers.getSigners();
    
    // Deploy a mock ERC20 for staking token and reward token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking", "STK", 18);
    const rewardToken = await MockERC20.deploy("Reward", "RWD", 18);
    await stakingToken.waitForDeployment();
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking with constructor args
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(
      await stakingToken.getAddress(),
      owner.address
    );
    await instance.waitForDeployment();

    // Add reward token and fund the reward distributor (owner)
    await instance.addReward(await rewardToken.getAddress());
    
    // Fund owner with reward tokens and approve contract
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.mint(owner.address, rewardAmount);
    await rewardToken.connect(owner).approve(await instance.getAddress(), rewardAmount);

    // Notify reward: 1000 tokens over 1 week (DURATION = 604800)
    await instance.connect(owner).notifyRewardAmount(
      await rewardToken.getAddress(),
      rewardAmount
    );

    // Staker stakes tokens
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.mint(staker.address, stakeAmount);
    await stakingToken.connect(staker).approve(await instance.getAddress(), stakeAmount);
    await instance.connect(staker).stake(stakeAmount);

    // Fast forward exactly 1 day (86400 seconds) to accrue rewards
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine");

    // Calculate expected reward per token:
    // timeElapsed = 86400, rewardRate = 1000e18 / 604800 ≈ 1.653e12
    // original: rewardPerTokenStored + (timeElapsed * rewardRate * 1e18) / totalSupply
    // totalSupply = 100e18
    // Expected increment = (86400 * (1000e18/604800) * 1e18) / 100e18
    // Simplified: (86400 * 1000e18) / 604800 / 100 = (86400 * 1000e18) / 60480000
    // = (86400/60480000) * 1000e18 = 0.00142857 * 1000e18 = 1.42857e18
    const expectedPerToken = ethers.parseEther("1.428571428571428571"); // 86400 * 1000 / 604800

    // Get actual reward per token from contract
    const actualPerToken = await instance.rewardPerToken(await rewardToken.getAddress());
    
    // With multiplication (original) this should match; with addition (mutant) it will be much smaller
    expect(actualPerToken).to.equal(expectedPerToken);
  });
});