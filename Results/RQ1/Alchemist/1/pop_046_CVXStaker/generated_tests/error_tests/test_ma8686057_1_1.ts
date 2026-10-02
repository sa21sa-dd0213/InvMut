import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker - kill mutant ma8686057 (withdrawAndUnwrap > to <)", function () {
  let owner: any;
  let operator: any;
  let addr1: any;
  let instance: any;
  let mockCLPToken: any;
  let mockBooster: any;
  let mockRewardPool: any;

  beforeEach(async function () {
    [owner, operator, addr1] = await ethers.getSigners();

    // Deploy mock ERC20 for CLP token
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    mockCLPToken = await ERC20Factory.deploy("CLP Token", "CLP", 18);
    await mockCLPToken.waitForDeployment();

    // Deploy mock booster
    const MockBooster = await ethers.getContractFactory("MockBooster");
    mockBooster = await MockBooster.deploy();
    await mockBooster.waitForDeployment();

    // Deploy mock reward pool
    const MockRewardPool = await ethers.getContractFactory("MockRewardPool");
    mockRewardPool = await MockRewardPool.deploy();
    await mockRewardPool.waitForDeployment();

    // Deploy CVXStaker with required constructor arguments
    const rewardTokens: string[] = [];
    const CVXStakerFactory = await ethers.getContractFactory("CVXStaker");
    instance = await CVXStakerFactory.deploy(
      operator.address,
      mockCLPToken.target,
      mockBooster.target,
      rewardTokens
    );
    await instance.waitForDeployment();

    // Set CVX pool info with mock reward pool
    await instance.connect(owner).setCvxPoolInfo(0, mockCLPToken.target, mockRewardPool.target);

    // Fund the contract with CLP tokens for testing
    const depositAmount = ethers.parseEther("100");
    await mockCLPToken.mint(instance.target, depositAmount);
  });

  it("should revert if withdrawAndUnwrap is called with amount > contract balance and toUnstake < 0 condition never executes", async function () {
    // Set up: contract has 100 CLP, we try to withdraw 200 CLP
    const withdrawAmount = ethers.parseEther("200");
    const clpBalance = await mockCLPToken.balanceOf(instance.target);
        
    // toUnstake = amount - clpBalance = 200 - 100 = 100 > 0
    // In original: if (toUnstake > 0) executes withdrawAndUnwrap on reward pool
    // In mutant: if (toUnstake < 0) is false (100 < 0 is false), so it skips reward pool withdrawal
    // This should cause the test to fail because the reward pool never gets called
    
    // Call withdrawAndUnwrap as operator (authorized)
    await instance.connect(operator).withdrawAndUnwrap(withdrawAmount, false, addr1.address);
    
    // Check that the reward pool's withdrawAndUnwrap was called (by checking balance changes)
    // If mutant is present, the reward pool was never called and the CLP transfer still happens
    // but the underlying staked tokens weren't withdrawn, which would be incorrect behavior
    
    // Verify addr1 received the CLP tokens (this transfer happens regardless)
    const addr1Balance = await mockCLPToken.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(withdrawAmount);
    
    // Verify the reward pool's withdrawAndUnwrap was called by checking the contract's CLP balance
    // In original: contract CLP balance should decrease by amount (100 -> 0, then withdraw 100 from pool)
    // In mutant: contract CLP balance goes from 100 to 0, but pool is never called, so total supply is wrong
    const finalContractBalance = await mockCLPToken.balanceOf(instance.target);
    expect(finalContractBalance).to.equal(0);
    
    // Additional check: verify the reward pool was called by checking a custom counter
    const withdrawCalls = await mockRewardPool.getWithdrawAndUnwrapCalls();
    expect(withdrawCalls).to.equal(1, "Reward pool withdrawAndUnwrap should have been called exactly once");
  });
});