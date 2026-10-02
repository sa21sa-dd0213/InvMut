import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m9497e076", function () {
  it("should detect the mutant that changes >= to == in _notifyReward", async function () {
    const [owner, distributor, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a reward token
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await staking.waitForDeployment();

    // Add reward token and set up
    await staking.connect(owner).addReward(await rewardToken.getAddress());

    // Transfer reward tokens to distributor
    await rewardToken.connect(owner).transfer(distributor.address, ethers.parseEther("10000"));
    await rewardToken.connect(distributor).approve(await staking.getAddress(), ethers.parseEther("10000"));

    // First notification: set initial reward period
    await staking.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      ethers.parseEther("7000") // 7000 tokens over 7 days = 1000 per day
    );

    // Fast forward time to exactly at period finish
    const periodFinish = await staking.rewardPeriodFinish(await rewardToken.getAddress());
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(periodFinish)]);
    await ethers.provider.send("evm_mine", []);

    // Now we are at block.timestamp == periodFinish
    // Get the current reward rate
    const rewardDataBefore = await staking.rewardData(await rewardToken.getAddress());
    const rateBefore = rewardDataBefore.rewardRate;

    // Fast forward one more second to be strictly after period finish
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(periodFinish) + 1]);
    await ethers.provider.send("evm_mine", []);

    // Notify a new reward amount (this should trigger the >= branch in original, but == branch in mutant)
    await staking.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      ethers.parseEther("7000")
    );

    // Get the new reward rate
    const rewardDataAfter = await staking.rewardData(await rewardToken.getAddress());
    const rateAfter = rewardDataAfter.rewardRate;

    // In the original contract, since block.timestamp > periodFinish, the reward rate should be
    // exactly 7000 / DURATION = 1000 * 1e18 / 86400 (approximately)
    // In the mutant, since block.timestamp != periodFinish (it's >), it will go to the else branch
    // and calculate a leftover, resulting in a different (higher) reward rate

    const expectedRate = ethers.parseEther("7000") / BigInt(86400 * 7); // DURATION = 86400 * 7

    // The mutant should produce a different rate because it incorrectly uses the else branch
    // when block.timestamp > periodFinish
    expect(rateAfter).to.not.equal(expectedRate);

    // Additional check: the mutant's rate should be higher because it adds leftover
    // from the previous period (which already ended)
    expect(rateAfter).to.be.gt(rateBefore);
  });
});