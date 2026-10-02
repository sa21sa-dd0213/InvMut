import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant m66fb6655 test", function () {
  it("should transfer CLP tokens to operator when sendToOperator is true after withdrawAllAndUnwrap", async function () {
    const [owner, operator, addr1] = await ethers.getSigners();

    // Deploy mock contracts for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockBooster = await ethers.getContractFactory("MockBooster");
    const MockRewardPool = await ethers.getContractFactory("MockRewardPool");

    const clpToken = await MockERC20.deploy("CLP Token", "CLP", ethers.parseEther("1000"));
    await clpToken.waitForDeployment();

    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();

    const rewardPool = await MockRewardPool.deploy();
    await rewardPool.waitForDeployment();

    const rewardTokens: string[] = [];

    // Deploy CVXStaker with constructor arguments
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const staker = await CVXStaker.deploy(
      operator.address,
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await staker.waitForDeployment();

    // Setup CVX pool info
    await staker.setCvxPoolInfo(1, await clpToken.getAddress(), await rewardPool.getAddress());

    // Setup mock reward pool to return CLP token balance
    const stakerAddress = await staker.getAddress();
    const clpTokenAddress = await clpToken.getAddress();

    // Fund the staker with CLP tokens
    await clpToken.transfer(stakerAddress, ethers.parseEther("100"));

    // Setup mock reward pool balanceOf to return the CLP balance
    await rewardPool.setBalanceOf(stakerAddress, ethers.parseEther("100"));

    // Get operator's CLP balance before
    const operatorBalanceBefore = await clpToken.balanceOf(operator.address);

    // Call withdrawAllAndUnwrap with sendToOperator = true
    await staker.connect(owner).withdrawAllAndUnwrap(true, true);

    // Get operator's CLP balance after
    const operatorBalanceAfter = await clpToken.balanceOf(operator.address);

    // Assert that operator received the tokens (this will fail on mutant where sendToOperator is replaced with false)
    expect(operatorBalanceAfter).to.be.gt(operatorBalanceBefore);
  });
});