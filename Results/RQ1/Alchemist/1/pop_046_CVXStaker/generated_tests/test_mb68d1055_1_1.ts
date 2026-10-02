import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant mb68d1055 - withdrawAndUnwrap with toUnstake = 0", function () {
  it("should not call withdrawAndUnwrap on reward pool when contract already has sufficient CLP balance", async function () {
    const [owner, operator, addr1] = await ethers.getSigners();

    // Deploy mock contracts for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockERC20.deploy("CLP", "CLP", 18);
    await clpToken.waitForDeployment();

    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();

    const MockRewardPool = await ethers.getContractFactory("MockRewardPool");
    const rewardPool = await MockRewardPool.deploy();
    await rewardPool.waitForDeployment();

    const rewardTokens: string[] = [];

    // Deploy CVXStaker
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const staker = await CVXStaker.deploy(
      operator.address,
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await staker.waitForDeployment();

    // Set up CVX pool info
    await staker.connect(owner).setCvxPoolInfo(0, await clpToken.getAddress(), await rewardPool.getAddress());

    // Fund staker with CLP tokens directly (simulating already having sufficient balance)
    await clpToken.mint(await staker.getAddress(), ethers.parseEther("100"));

    // Verify the staker has CLP balance
    const stakerBalance = await clpToken.balanceOf(await staker.getAddress());
    expect(stakerBalance).to.equal(ethers.parseEther("100"));

    // Get initial reward pool withdraw count
    const initialWithdrawCount = await rewardPool.withdrawCount();

    // Call withdrawAndUnwrap with amount less than or equal to staker's CLP balance
    // This means toUnstake will be 0 (since amount <= clpBalance)
    await staker.connect(operator).withdrawAndUnwrap(ethers.parseEther("50"), false, addr1.address);

    // Verify that reward pool's withdrawAndUnwrap was NOT called (toUnstake was 0)
    const finalWithdrawCount = await rewardPool.withdrawCount();
    expect(finalWithdrawCount).to.equal(initialWithdrawCount);

    // Verify CLP tokens were transferred correctly
    expect(await clpToken.balanceOf(addr1.address)).to.equal(ethers.parseEther("50"));
    expect(await clpToken.balanceOf(await staker.getAddress())).to.equal(ethers.parseEther("50"));
  });
});