import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant test - depositAndStake shutdown check", function () {
  it("should revert or skip deposit when pool is shutdown (mutant removes shutdown check)", async function () {
    const [owner, operator] = await ethers.getSigners();

    // Deploy mock CLP token
    const MockToken = await ethers.getContractFactory("MockERC20");
    const clpToken = await MockToken.deploy();
    await clpToken.waitForDeployment();

    // Deploy mock RewardPool
    const MockRewardPool = await ethers.getContractFactory("MockBaseRewardPool");
    const rewardsPool = await MockRewardPool.deploy();
    await rewardsPool.waitForDeployment();

    // Deploy mock Booster that returns shutdown=true for poolInfo
    const MockBooster = await ethers.getContractFactory("MockBooster");
    const mockBooster = await MockBooster.deploy();
    await mockBooster.waitForDeployment();

    // Constructor arguments for CVXStaker: _operator, _clpToken, _booster, _rewardTokens
    const rewardTokens: string[] = [];
    const cvxStaker = await ethers.deployContract("CVXStaker", [
      operator.address,
      await clpToken.getAddress(),
      await mockBooster.getAddress(),
      rewardTokens
    ]);
    await cvxStaker.waitForDeployment();

    // Setup pool info via owner
    const pId = 0;
    const tokenAddr = await clpToken.getAddress();
    const rewardsAddr = await rewardsPool.getAddress();
    await cvxStaker.connect(owner).setCvxPoolInfo(pId, tokenAddr, rewardsAddr);

    // Set operator
    await cvxStaker.connect(owner).setOperator(operator.address);

    // Set mock booster to return shutdown = true
    await mockBooster.setShutdown(true);

    // Get some CLP tokens for the operator to deposit
    const depositAmount = ethers.parseEther("100");
    await clpToken.mint(operator.address, depositAmount);
    await clpToken.connect(operator).approve(await cvxStaker.getAddress(), depositAmount);

    // Try to depositAndStake - original would skip, mutant would try to proceed
    // If mutant tries to proceed, it will fail because the booster is shutdown
    // The booster.deposit() call should revert when shutdown is true
    await expect(
      cvxStaker.connect(operator).depositAndStake(depositAmount)
    ).to.not.be.reverted;

    // Verify that no tokens were transferred to booster (since shutdown check causes skip)
    const boosterBalance = await clpToken.balanceOf(await mockBooster.getAddress());
    expect(boosterBalance).to.equal(0);
  });
});