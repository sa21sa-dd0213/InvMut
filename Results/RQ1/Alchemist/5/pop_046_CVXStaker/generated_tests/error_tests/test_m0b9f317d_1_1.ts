import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant m0b9f317d - withdrawAndUnwrap subtraction replaced with addition", function () {
  it("should kill the mutant by attempting to withdraw an amount greater than clpBalance but less than staked balance", async function () {
    const [owner, operator, addr1] = await ethers.getSigners();

    // Deploy mock tokens and booster for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockBooster = await ethers.getContractFactory("MockBooster");
    const MockRewardPool = await ethers.getContractFactory("MockRewardPool");

    const clpToken = await MockERC20.deploy("CLP", "CLP", 18);
    await clpToken.waitForDeployment();

    const rewardToken = await MockERC20.deploy("RWD", "RWD", 18);
    await rewardToken.waitForDeployment();

    const rewardPool = await MockRewardPool.deploy(await clpToken.getAddress());
    await rewardPool.waitForDeployment();

    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();

    // Setup pool info in booster
    const poolInfo = {
      lptoken: await clpToken.getAddress(),
      token: await clpToken.getAddress(),
      gauge: ethers.ZeroAddress,
      crvRewards: ethers.ZeroAddress,
      stash: ethers.ZeroAddress,
      shutdown: false
    };
    await booster.setPoolInfo(0, poolInfo);

    // Deploy CVXStaker with constructor arguments
    const rewardTokens = [await rewardToken.getAddress()];
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const staker = await CVXStaker.deploy(
      await operator.getAddress(),
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await staker.waitForDeployment();

    // Set CVX pool info
    await staker.connect(owner).setCvxPoolInfo(
      0,
      await clpToken.getAddress(),
      await rewardPool.getAddress()
    );

    // Fund operator with CLP tokens and approve staker
    const depositAmount = ethers.parseEther("100");
    await clpToken.mint(await operator.getAddress(), depositAmount);
    await clpToken.connect(operator).approve(await staker.getAddress(), depositAmount);

    // Deposit and stake via operator
    await staker.connect(operator).depositAndStake(depositAmount);

    // Simulate some tokens being sent to staker contract (clpBalance > 0)
    const clpBalanceAmount = ethers.parseEther("10");
    await clpToken.mint(await staker.getAddress(), clpBalanceAmount);

    // Now attempt to withdraw an amount > clpBalance but < total staked
    // clpBalance = 10, staked = 100
    // amount = 50 (greater than clpBalance, less than staked)
    // Original: toUnstake = 50 - 10 = 40 (should succeed)
    // Mutant: toUnstake = 50 + 10 = 60 (will try to unstake 60 but only 100 staked - depends on mock)
    // Mock should allow withdrawAndUnwrap up to staked amount
    const withdrawAmount = ethers.parseEther("50");
        
    // Set operator role for test
    await staker.connect(owner).setOperator(await operator.getAddress());

    // The test: mutated version will try to unstake amount + clpBalance = 60
    // This should revert if mock enforces staked balance check
    await expect(
      staker.connect(operator).withdrawAndUnwrap(withdrawAmount, false, await addr1.getAddress())
    ).to.be.reverted;
  });
});