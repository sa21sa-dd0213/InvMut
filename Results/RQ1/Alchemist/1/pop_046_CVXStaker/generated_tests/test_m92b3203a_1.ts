import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant m92b3203a test", function () {
  it("should revert or not transfer tokens when withdrawAndUnwrap is called with to = address(0)", async function () {
    const [owner, operator, addr1] = await ethers.getSigners();

    // Deploy mock contracts for dependencies
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockERC20.deploy("CLP Token", "CLP", ethers.parseEther("1000"));
    await clpToken.waitForDeployment();

    const MockBooster = await ethers.getContractFactory("MockBooster");
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();

    const MockRewardPool = await ethers.getContractFactory("MockRewardPool");
    const rewardPool = await MockRewardPool.deploy();
    await rewardPool.waitForDeployment();

    // Setup reward tokens array
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

    // Set pool info
    await staker.connect(owner).setCvxPoolInfo(0, await clpToken.getAddress(), await rewardPool.getAddress());

    // Fund the staker with CLP tokens (simulating prior deposits)
    await clpToken.transfer(await staker.getAddress(), ethers.parseEther("100"));

    // Record balances before
    const stakerBalanceBefore = await clpToken.balanceOf(await staker.getAddress());
    const zeroBalanceBefore = await clpToken.balanceOf(ethers.ZeroAddress);

    // Call withdrawAndUnwrap with to = address(0) - should not transfer in original
    await staker.connect(operator).withdrawAndUnwrap(ethers.parseEther("50"), false, ethers.ZeroAddress);

    // Check that no tokens were transferred to zero address
    const stakerBalanceAfter = await clpToken.balanceOf(await staker.getAddress());
    const zeroBalanceAfter = await clpToken.balanceOf(ethers.ZeroAddress);

    // In original: tokens stay in contract, zero address balance unchanged
    // In mutant: tokens would be transferred to zero address, changing balances
    expect(stakerBalanceAfter).to.equal(stakerBalanceBefore);
    expect(zeroBalanceAfter).to.equal(zeroBalanceBefore);
  });
});