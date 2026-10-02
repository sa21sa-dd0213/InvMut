import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker - kill mutant m5b8dd8dd (withdrawAndUnwrap condition)", function () {
  it("should skip reward pool withdrawal when CLP balance is sufficient", async function () {
    const [owner, operator, addr1] = await ethers.getSigners();
    
    // Deploy mock contracts for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const MockBooster = await ethers.getContractFactory("MockBooster");
    const MockRewardPool = await ethers.getContractFactory("MockRewardPool");
    
    const clpToken = await MockERC20.deploy("CLP Token", "CLP", 18);
    await clpToken.waitForDeployment();
    
    const booster = await MockBooster.deploy();
    await booster.waitForDeployment();
    
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
    
    // Setup: set cvxPoolInfo and fund contract with CLP tokens
    await staker.connect(owner).setCvxPoolInfo(0, await clpToken.getAddress(), await rewardPool.getAddress());
    
    // Fund the staker contract with CLP tokens (simulating existing balance)
    const contractCLPBalance = ethers.parseEther("100");
    await clpToken.transfer(await staker.getAddress(), contractCLPBalance);
    
    // Track if reward pool's withdrawAndUnwrap is called
    let rewardPoolCalled = false;
    await rewardPool.setTrackWithdrawAndUnwrap(() => { rewardPoolCalled = true; });
    
    // Call withdrawAndUnwrap with amount LESS than contract's CLP balance
    // toUnstake = amount - clpBalance = 50 - 100 = 0, so condition toUnstake > 0 is FALSE in original
    const withdrawAmount = ethers.parseEther("50");
    
    await staker.connect(operator).withdrawAndUnwrap(withdrawAmount, false, addr1.address);
    
    // In original: reward pool's withdrawAndUnwrap should NOT be called
    // In mutant: reward pool's withdrawAndUnwrap IS called (because condition is always true)
    expect(rewardPoolCalled).to.be.false;
  });
});