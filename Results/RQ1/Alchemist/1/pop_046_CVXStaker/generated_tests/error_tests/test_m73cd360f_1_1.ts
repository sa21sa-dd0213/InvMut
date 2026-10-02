import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant kill test - withdrawAndUnwrap division by zero", function () {
  it("should kill mutant m73cd360f by calling withdrawAndUnwrap when clpBalance is zero and amount is greater than zero", async function () {
    const [owner, operator, addr1] = await ethers.getSigners();

    // Deploy mock tokens and booster for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockERC20.deploy("CLP Token", "CLP", 18);
    await clpToken.waitForDeployment();

    const rewardToken = await MockERC20.deploy("Reward", "RWD", 18);
    await rewardToken.waitForDeployment();

    // Deploy mock booster
    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();

    // Deploy mock reward pool
    const MockRewardPool = await ethers.getContractFactory("MockRewardPool");
    const rewardPool = await MockRewardPool.deploy();
    await rewardPool.waitForDeployment();

    // Setup booster pool info
    await booster.setPoolInfo(0, {
      lptoken: await clpToken.getAddress(),
      token: await clpToken.getAddress(),
      gauge: ethers.ZeroAddress,
      crvRewards: ethers.ZeroAddress,
      stash: ethers.ZeroAddress,
      shutdown: false
    });

    const rewardTokens = [await rewardToken.getAddress()];

    // Deploy CVXStaker
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const staker = await CVXStaker.deploy(
      await operator.getAddress(),
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await staker.waitForDeployment();

    // Set CVX pool info
    await staker.setCvxPoolInfo(0, await clpToken.getAddress(), await rewardPool.getAddress());

    // Set rewards recipient so getReward doesn't fail
    await staker.setRewardsRecipient(await addr1.getAddress());

    // Ensure clpBalance is zero by not minting any tokens to staker
    // Now call withdrawAndUnwrap with amount > 0 while clpBalance is 0
    // This will trigger the ternary: amount < clpBalance (0 < 0 is false) so toUnstake = amount / clpBalance
    // Division by zero should revert in the mutant, but original would compute amount - 0 = amount

    await expect(
      staker.connect(operator).withdrawAndUnwrap(100, false, await addr1.getAddress())
    ).to.not.be.reverted; // Original succeeds, mutant reverts with division by zero
  });
});