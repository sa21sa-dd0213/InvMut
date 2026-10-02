import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker - kill mutant mac4b714e (withdrawAndUnwrap to address transfer)", function () {
  let owner: any;
  let operator: any;
  let addr1: any;
  let clpToken: any;
  let booster: any;
  let rewardsPool: any;
  let cvxStaker: any;

  beforeEach(async function () {
    [owner, operator, addr1] = await ethers.getSigners();

    // Deploy mock CLP token (ERC20)
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    clpToken = await ERC20Mock.deploy("CLP Token", "CLP", 18);
    await clpToken.waitForDeployment();

    // Deploy mock Booster
    const BoosterMock = await ethers.getContractFactory("BoosterMock");
    booster = await BoosterMock.deploy();
    await booster.waitForDeployment();

    // Deploy mock Rewards Pool
    const RewardsPoolMock = await ethers.getContractFactory("RewardsPoolMock");
    rewardsPool = await RewardsPoolMock.deploy();
    await rewardsPool.waitForDeployment();

    // Setup pool info in booster
    const poolInfo = {
      lptoken: await clpToken.getAddress(),
      token: ethers.ZeroAddress,
      gauge: ethers.ZeroAddress,
      crvRewards: ethers.ZeroAddress,
      stash: ethers.ZeroAddress,
      shutdown: false
    };
    await booster.setPoolInfo(0, poolInfo);

    // Deploy CVXStaker with required constructor arguments
    const rewardTokens: string[] = [];
    const CVXStakerFactory = await ethers.getContractFactory("CVXStaker");
    cvxStaker = await CVXStakerFactory.deploy(
      await operator.getAddress(),
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await cvxStaker.waitForDeployment();

    // Set CVX pool info
    await cvxStaker.connect(owner).setCvxPoolInfo(0, await clpToken.getAddress(), await rewardsPool.getAddress());

    // Fund the staker with CLP tokens for testing
    await clpToken.mint(await cvxStaker.getAddress(), ethers.parseEther("100"));
  });

  it("should transfer CLP tokens to specified recipient when withdrawAndUnwrap is called with non-zero to address", async function () {
    // Setup: ensure staker has balance and we can call withdrawAndUnwrap as operator or owner
    const amount = ethers.parseEther("10");
    const recipient = addr1;

    // Get initial balance of recipient
    const initialBalance = await clpToken.balanceOf(await recipient.getAddress());

    // Call withdrawAndUnwrap as operator with a valid non-zero to address
    await cvxStaker.connect(operator).withdrawAndUnwrap(amount, false, await recipient.getAddress());

    // Check that the recipient actually received the tokens
    const finalBalance = await clpToken.balanceOf(await recipient.getAddress());
    expect(finalBalance - initialBalance).to.equal(amount);

    // If mutant is present (condition is false), recipient will not receive tokens
    // and the test will fail because finalBalance will equal initialBalance
  });
});