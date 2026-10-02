import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m1bff88a2 (_rewardPerToken + instead of -)", function () {
  let stakingToken: any;
  let rewardToken: any;
  let staking: any;
  let owner: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a mock ERC20 for staking token
    const ERC20Factory = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 for reward token
    rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    staking = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();

    // Add reward token
    await staking.connect(owner).addReward(await rewardToken.getAddress());

    // Transfer some tokens to addr1 for staking
    await stakingToken.connect(owner).transfer(addr1.address, ethers.parseEther("1000"));

    // Approve staking contract to spend addr1's tokens
    await stakingToken.connect(addr1).approve(await staking.getAddress(), ethers.parseEther("1000"));
  });

  it("should kill mutant by verifying reward per token calculation is within expected bounds", async function () {
    // Stake tokens
    await staking.connect(addr1).stake(ethers.parseEther("100"));

    // Transfer reward tokens to the staking contract
    await rewardToken.connect(owner).transfer(await staking.getAddress(), ethers.parseEther("1000"));

    // Notify reward amount (this will start the reward period)
    await rewardToken.connect(owner).approve(await staking.getAddress(), ethers.parseEther("1000"));
    await staking.connect(owner).notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("1000"));

    // Fast forward 3 days (259200 seconds)
    await ethers.provider.send("evm_increaseTime", [259200]);
    await ethers.provider.send("evm_mine", []);

    // Get the reward per token
    const rewardPerToken = await staking.rewardPerToken(await rewardToken.getAddress());

    // Calculate expected reward rate: 1000 tokens / 7 days = ~1000/604800 tokens per second
    // After 3 days, max reward per token should be (3 days * rewardRate * 1e18) / totalSupply
    // Total supply is 100 tokens = 100e18
    // Reward rate = 1000e18 / 604800 = ~1.652e15 wei per second
    // After 3 days (259200 seconds): accumulated = (259200 * 1.652e15 * 1e18) / 100e18 = ~4.28e21
    // So rewardPerToken should be around 4.28e21, definitely less than 1e30

    // The mutant would produce a massive value because it adds timestamps instead of subtracting
    // This would result in rewardPerToken being astronomically large (like 1e50 or more)
    expect(rewardPerToken).to.be.lessThan(ethers.parseEther("1000000")); // Reasonable upper bound

    // Also verify it's greater than 0 since rewards have accrued
    expect(rewardPerToken).to.be.greaterThan(0);
  });
});