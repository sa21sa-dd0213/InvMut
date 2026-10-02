import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Mutant kill test for m461fe53a", function () {
  it("should kill the mutant by verifying reward rate calculation after notifyRewardAmount", async function () {
    const [owner, distributor, staker] = await ethers.getSigners();

    // Deploy a mock ERC20 for staking token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 for reward token
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking with constructor arguments: _stakingToken, _distributor
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), distributor.address);
    await staking.waitForDeployment();

    // Setup: add reward token, transfer rewards to distributor
    await staking.connect(owner).addReward(await rewardToken.getAddress());
    await rewardToken.transfer(distributor.address, ethers.parseEther("1000000"));
    await rewardToken.connect(distributor).approve(await staking.getAddress(), ethers.parseEther("1000000"));

    // Staker stakes tokens
    await stakingToken.transfer(staker.address, ethers.parseEther("1000"));
    await stakingToken.connect(staker).approve(await staking.getAddress(), ethers.parseEther("1000"));
    await staking.connect(staker).stake(ethers.parseEther("1000"));

    // Notify reward: 1000 tokens over DURATION (7 days = 604800 seconds)
    // Expected reward rate: 1000 / 604800 ≈ 0.001653 tokens per second
    await staking.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      ethers.parseEther("1000")
    );

    // Query reward rate from the contract
    const rewardData = await staking.rewardData(await rewardToken.getAddress());
    const rewardRate = rewardData.rewardRate;

    // Expected reward rate (original): 1000 * 1e18 / 604800 ≈ 1.653 * 10^15
    // Mutant reward rate: 1000 * 1e18 + 604800 (hugely different)
    const expectedRate = ethers.parseEther("1000") / BigInt(604800);

    // The mutant would produce a rate approximately equal to 1000 * 1e18 + 604800
    // which is vastly different from the expected rate
    expect(rewardRate).to.be.closeTo(expectedRate, expectedRate / BigInt(100));
  });
});