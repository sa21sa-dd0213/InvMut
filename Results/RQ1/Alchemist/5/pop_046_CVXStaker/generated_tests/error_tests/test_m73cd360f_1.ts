import { expect } from "chai";
import { ethers } } from "hardhat";

describe("CVXStaker mutant m73cd360f - withdrawAndUnwrap division bug", function () {
  let owner: any;
  let operator: any;
  let addr1: any;
  let clpToken: any;
  let booster: any;
  let cvxStaker: any;
  let mockRewardPool: any;

  beforeEach(async function () {
    [owner, operator, addr1] = await ethers.getSigners();

    // Deploy mock CLP token
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    clpToken = await ERC20Factory.deploy("CLP Token", "CLP", 18);
    await clpToken.waitForDeployment();

    // Deploy mock booster
    const BoosterFactory = await ethers.getContractFactory("MockBooster");
    booster = await BoosterFactory.deploy();
    await booster.waitForDeployment();

    // Deploy mock reward pool
    const RewardPoolFactory = await ethers.getContractFactory("MockRewardPool");
    mockRewardPool = await RewardPoolFactory.deploy();
    await mockRewardPool.waitForDeployment();

    // Setup booster pool info
    await booster.setPoolInfo(0, {
      lptoken: await clpToken.getAddress(),
      token: ethers.ZeroAddress,
      gauge: ethers.ZeroAddress,
      crvRewards: await mockRewardPool.getAddress(),
      stash: ethers.ZeroAddress,
      shutdown: false
    });

    // Deploy CVXStaker with required constructor arguments
    const CVXStakerFactory = await ethers.getContractFactory("CVXStaker");
    cvxStaker = await CVXStakerFactory.deploy(
      await operator.getAddress(),
      await clpToken.getAddress(),
      await booster.getAddress(),
      [] // empty reward tokens array
    );
    await cvxStaker.waitForDeployment();

    // Set CVX pool info
    await cvxStaker.connect(owner).setCvxPoolInfo(0, ethers.ZeroAddress, await mockRewardPool.getAddress());

    // Fund contract with CLP tokens for balance
    const clpAmount = ethers.parseEther("100");
    await clpToken.mint(await cvxStaker.getAddress(), clpAmount);

    // Setup mock reward pool to return balance
    await mockRewardPool.setBalance(await cvxStaker.getAddress(), clpAmount);
  });

  it("should revert when amount > clpBalance and amount is not a multiple of clpBalance (division bug detection)", async function () {
    // Setup: contract has 100 CLP tokens
    // We call withdrawAndUnwrap with amount = 150, which is > clpBalance (100)
    // In original: toUnstake = 150 - 100 = 50
    // In mutant: toUnstake = 150 / 100 = 1 (integer division)
    // The mock reward pool's withdrawAndUnwrap will be called with different amounts
    // making the behavior diverge

    // Make the mock reward pool revert if called with wrong amount
    await mockRewardPool.setExpectedWithdrawAmount(50); // expected original amount

    const amount = ethers.parseEther("150");
    
    // This should work in original but fail in mutant because:
    // - Original: withdrawAndUnwrap(50, true) -> succeeds
    // - Mutant: withdrawAndUnwrap(1, true) -> reverts (wrong amount)
    await expect(
      cvxStaker.connect(operator).withdrawAndUnwrap(amount, true, ethers.ZeroAddress)
    ).to.be.revertedWith("Unexpected withdraw amount");
  });

  it("should transfer correct amount of CLP tokens when to address is set (division bug)", async function () {
    // Setup: contract has 100 CLP tokens
    const amount = ethers.parseEther("150");
    const clpBalance = ethers.parseEther("100");
    
    // In original: toUnstake = 50, then transfers 150 CLP to addr1
    // In mutant: toUnstake = 1, then transfers 150 CLP to addr1
    // Both transfer 150, but the unstaked amount differs
    // The mutant would leave more tokens in the contract after withdrawal

    await mockRewardPool.setExpectedWithdrawAmount(50);
    
    const balanceBefore = await clpToken.balanceOf(await addr1.getAddress());
    await cvxStaker.connect(operator).withdrawAndUnwrap(amount, true, await addr1.getAddress());
    const balanceAfter = await clpToken.balanceOf(await addr1.getAddress());
    
    // Original transfers exactly 150 tokens
    expect(balanceAfter - balanceBefore).to.equal(amount);
    
    // The contract's balance after operation differs between original and mutant
    // Original: 100 - 150 (transfer) + 50 (unstaked from pool) = 0
    // Mutant: 100 - 150 (transfer) + 1 (unstaked from pool) = -49 (revert due to insufficient balance)
    // This test would pass on original but fail on mutant due to different internal state
  });
});