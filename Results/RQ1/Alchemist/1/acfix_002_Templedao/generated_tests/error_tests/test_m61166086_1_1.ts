import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant test - rewardRate multiplication vs addition", function () {
  it("should kill mutant m61166086 by verifying reward per token scales proportionally with reward rate", async function () {
    const [owner, staker] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a reward token
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Add reward token
    await instance.addReward(await rewardToken.getAddress());

    // Fund staker with staking tokens
    await stakingToken.transfer(staker.address, ethers.parseEther("1000"));
    await stakingToken.connect(staker).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Stake tokens
    await instance.connect(staker).stake(ethers.parseEther("100"));

    // Fund the contract with rewards
    const rewardAmount = ethers.parseEther("1000"); // 1000 tokens over 1 week
    await rewardToken.transfer(owner.address, rewardAmount);
    await rewardToken.approve(await instance.getAddress(), rewardAmount);

    // Notify reward
    await instance.notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);

    // Calculate expected reward rate: 1000 tokens / 604800 seconds (7 days)
    const expectedRewardRate = rewardAmount / BigInt(86400 * 7);

    // Fast forward 3 days
    await ethers.provider.send("evm_increaseTime", [86400 * 3]);
    await ethers.provider.send("evm_mine");

    // Get reward per token
    const rewardPerToken = await instance.rewardPerToken(await rewardToken.getAddress());

    // In the original: rewardPerTokenStored + ((timeElapsed * rewardRate * 1e18) / totalSupply)
    // After 3 days: timeElapsed = 259200, rewardRate = 1000/604800 ≈ 0.001653
    // Expected = (259200 * 0.001653 * 1e18) / 100e18 ≈ 4285.71 (in 1e18 precision)
    // In the mutant: rewardRate + 1e18 instead of rewardRate * 1e18
    // Mutant would give: rewardPerTokenStored + ((timeElapsed * (rewardRate + 1e18)) / totalSupply)
    // This would be astronomically larger

    // Calculate the expected value for the original contract
    const timeElapsed = BigInt(86400 * 3);
    const totalSupply = await instance.totalSupply();
    const rewardData = await instance.rewardData(await rewardToken.getAddress());

    // For original: rewardPerTokenStored + (timeElapsed * rewardRate * 1e18) / totalSupply
    const expectedIncrement = (timeElapsed * expectedRewardRate * ethers.parseEther("1")) / totalSupply;
    const expectedRewardPerToken = BigInt(rewardData.rewardPerTokenStored) + expectedIncrement;

    // For mutant: rewardPerTokenStored + (timeElapsed * (rewardRate + 1e18)) / totalSupply
    const mutantIncrement = (timeElapsed * (expectedRewardRate + ethers.parseEther("1"))) / totalSupply;
    const mutantRewardPerToken = BigInt(rewardData.rewardPerTokenStored) + mutantIncrement;

    // The original reward per token should be much smaller than the mutant version
    // The mutant adds 1e18 to the reward rate instead of multiplying, causing huge inflation
    expect(rewardPerToken).to.be.lessThan(mutantRewardPerToken);

    // Additionally, verify the reward per token is reasonable (original behavior)
    // The reward per token after 3 days with 100 tokens staked and 1000 reward over 7 days
    // should be approximately: (259200 * 1653 * 1e18) / (100e18 * 1e18) ≈ 4.28 (in actual tokens)
    // In 1e18 precision: ~4.28e18
    // This should be much less than the mutant which would give ~259200 * 1e18 / 100e18 = 2.592e21
    expect(rewardPerToken).to.be.lessThan(ethers.parseEther("100")); // Original would be ~4.28
    expect(rewardPerToken).to.be.gt(ethers.parseEther("0.001")); // Must be positive

    // Check earned rewards for staker
    const earned = await instance.earned(staker.address, await rewardToken.getAddress());

    // For original: (balance * rewardPerToken) / 1e18 = (100e18 * ~4.28e18) / 1e18 ≈ 428e18
    // For mutant: rewardPerToken would be huge, so earned would also be huge
    expect(earned).to.be.lessThan(ethers.parseEther("10000")); // Original would be ~428
    expect(earned).to.be.gt(ethers.parseEther("0.1")); // Must be positive
  });
});