import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant mf0897851 - withdrawAndUnwrap operator comparison", function () {
  it("should kill mutant by calling withdrawAndUnwrap with amount > clpBalance, expecting unstaking from reward pool", async function () {
    const [owner, operator, addr1] = await ethers.getSigners();

    // Deploy mock contracts for the required interfaces
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockBooster = await ethers.getContractFactory("MockBooster");
    const MockBaseRewardPool = await ethers.getContractFactory("MockBaseRewardPool");

    const clpToken = await MockERC20.deploy("CLP", "CLP", 18);
    await clpToken.waitForDeployment();

    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();

    const rewardPool = await MockBaseRewardPool.deploy();
    await rewardPool.waitForDeployment();

    // Setup booster to return pool info with our reward pool
    await booster.setPoolInfo(0, {
      lptoken: await clpToken.getAddress(),
      token: await clpToken.getAddress(),
      gauge: ethers.ZeroAddress,
      crvRewards: await rewardPool.getAddress(),
      stash: ethers.ZeroAddress,
      shutdown: false
    });

    // Deploy CVXStaker
    const rewardTokens: string[] = [];
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const staker = await CVXStaker.deploy(
      await operator.getAddress(),
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await staker.waitForDeployment();

    // Setup CVX pool info
    await staker.connect(owner).setCvxPoolInfo(0, await clpToken.getAddress(), await rewardPool.getAddress());

    // Give CLP tokens to staker contract
    const initialBalance = ethers.parseEther("100");
    await clpToken.mint(await staker.getAddress(), initialBalance);

    // Now call withdrawAndUnwrap with amount GREATER than clpBalance (e.g., 200)
    const withdrawAmount = ethers.parseEther("200");
    const clpBalanceBefore = await clpToken.balanceOf(await staker.getAddress());

    // The original: amount (200) > clpBalance (100) => toUnstake = 200 - 100 = 100 (should call withdrawAndUnwrap on reward pool)
    // The mutant: amount (200) > clpBalance (100) => toUnstake = 0 (skips reward pool withdrawal)
    
    // Track if reward pool's withdrawAndUnwrap was called
    let rewardPoolCalled = false;
    await rewardPool.setWithdrawAndUnwrapCallback(() => { rewardPoolCalled = true; });

    // Execute the transaction as operator
    const tx = await staker.connect(operator).withdrawAndUnwrap(withdrawAmount, false, await addr1.getAddress());
    await tx.wait();

    // Assert that the reward pool's withdrawAndUnwrap was called (this should fail on mutant)
    expect(rewardPoolCalled).to.be.true;
  });
});