import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m0e9a4438 test", function () {
  it("should detect the mutant by verifying correct reward per token calculation with addition vs multiplication", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock ERC20 for staking token
    const ERC20Factory = await ethers.getContractFactory("contracts/test/ERC20Mock.sol:ERC20Mock");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 for reward token
    const rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Add reward token
    await instance.addReward(await rewardToken.getAddress());

    // Transfer staking tokens to user and approve
    await stakingToken.transfer(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // User stakes tokens
    await instance.connect(user).stake(ethers.parseEther("100"));

    // Owner notifies reward (100 tokens over 1 week = 86400*7 seconds)
    await rewardToken.transfer(owner.address, ethers.parseEther("1000"));
    await rewardToken.approve(await instance.getAddress(), ethers.parseEther("100"));
    await instance.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("100"));

    // Fast forward half the duration (3.5 days)
    await ethers.provider.send("evm_increaseTime", [86400 * 3 + 43200]);
    await ethers.provider.send("evm_mine", []);

    // Calculate expected reward per token manually
    // Original formula: rewardPerTokenStored + ((timeElapsed * rewardRate * 1e18) / totalSupply())
    // After half duration: 0 + ((302400 * (100e18 / 604800) * 1e18) / 100e18)
    // = (302400 * 165343915343915343 * 1e18) / 100e18 = 500000000000000000000000000000000000 (0.5e18)
    // But we can simply compare the earned() output which uses _rewardPerToken internally

    const earned = await instance.earned(user.address, await rewardToken.getAddress());

    // If the mutant is active (multiplication instead of addition), 
    // the reward per token would be: 0 * ((timeElapsed * rewardRate * 1e18) / totalSupply()) = 0
    // So earned would be 0 instead of the correct positive value
    expect(earned).to.be.gt(0);

    // Additional verification: after full duration, earned should equal half the notified reward
    // (since user has 100 out of 100 total staked = 100%)
    await ethers.provider.send("evm_increaseTime", [86400 * 3 + 43200]);
    await ethers.provider.send("evm_mine", []);

    const earnedAfterFull = await instance.earned(user.address, await rewardToken.getAddress());
    // With addition: user should earn ~50 tokens (half of 100 because half the duration passed before first check)
    // With multiplication: would be 0 or extremely wrong value
    expect(earnedAfterFull).to.be.gt(ethers.parseEther("49"));
    expect(earnedAfterFull).to.be.lt(ethers.parseEther("51"));
  });
});