import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant m779f41b7 - withdrawAndUnwrap to non-zero address", function () {
  let instance: any;
  let owner: any;
  let operator: any;
  let addr1: any;
  let clpToken: any;
  let mockBooster: any;
  let mockRewards: any;
  let rewardTokens: string[];

  before(async function () {
    [owner, operator, addr1] = await ethers.getSigners();

    // Deploy mock CLP token
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    clpToken = await ERC20Factory.deploy("CLP Token", "CLP", 18);
    await clpToken.waitForDeployment();

    // Deploy mock booster
    const BoosterFactory = await ethers.getContractFactory("MockBooster");
    mockBooster = await BoosterFactory.deploy();
    await mockBooster.waitForDeployment();

    // Deploy mock rewards pool
    const RewardsFactory = await ethers.getContractFactory("MockRewardsPool");
    mockRewards = await RewardsFactory.deploy();
    await mockRewards.waitForDeployment();

    rewardTokens = [];
  });

  beforeEach(async function () {
    const Factory = await ethers.getContractFactory("CVXStaker");
    instance = await Factory.deploy(
      operator.address,
      await clpToken.getAddress(),
      await mockBooster.getAddress(),
      rewardTokens
    );
    await instance.waitForDeployment();

    // Set pool info
    await instance.connect(owner).setCvxPoolInfo(0, await clpToken.getAddress(), await mockRewards.getAddress());
  });

  it("should transfer CLP tokens to non-zero address when withdrawAndUnwrap is called with valid recipient", async function () {
    // Setup: Transfer some CLP tokens to the staker contract
    const depositAmount = ethers.parseEther("100");
    await clpToken.connect(owner).transfer(await instance.getAddress(), depositAmount);

    // Record balance before
    const recipientBalanceBefore = await clpToken.balanceOf(addr1.address);

    // Call withdrawAndUnwrap with a non-zero recipient address
    await instance.connect(operator).withdrawAndUnwrap(depositAmount, false, addr1.address);

    // Check that tokens were transferred to the recipient
    const recipientBalanceAfter = await clpToken.balanceOf(addr1.address);
    expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(depositAmount);
  });
});