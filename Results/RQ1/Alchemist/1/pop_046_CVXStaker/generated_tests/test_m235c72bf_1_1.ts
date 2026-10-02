import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker - getReward mutant detection", function () {
  let owner: any;
  let operator: any;
  let addr1: any;
  let cvxStaker: any;
  let mockCLPToken: any;
  let mockRewardToken: any;
  let mockBooster: any;
  let mockRewardPool: any;

  // Mock token ABI for testing
  const mockTokenABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
  ];

  beforeEach(async function () {
    [owner, operator, addr1] = await ethers.getSigners();

    // Deploy mock CLP token
    const MockTokenFactory = await ethers.getContractFactory("MockERC20");
    mockCLPToken = await MockTokenFactory.deploy("CLP Token", "CLP");
    await mockCLPToken.waitForDeployment();

    // Deploy mock reward token
    mockRewardToken = await MockTokenFactory.deploy("Reward Token", "RWD");
    await mockRewardToken.waitForDeployment();

    // Deploy mock booster
    const MockBoosterFactory = await ethers.getContractFactory("MockCVXBooster");
    mockBooster = await MockBoosterFactory.deploy();
    await mockBooster.waitForDeployment();

    // Deploy mock reward pool
    const MockRewardPoolFactory = await ethers.getContractFactory("MockBaseRewardPool");
    mockRewardPool = await MockRewardPoolFactory.deploy();
    await mockRewardPool.waitForDeployment();

    // Setup mock booster pool info
    await mockBooster.setPoolInfo(0, mockCLPToken.target, mockRewardPool.target, false);

    // Deploy CVXStaker with constructor arguments
    const rewardTokens = [mockRewardToken.target];
    const CVXStakerFactory = await ethers.getContractFactory("CVXStaker");
    cvxStaker = await CVXStakerFactory.deploy(
      operator.address,
      mockCLPToken.target,
      mockBooster.target,
      rewardTokens
    );
    await cvxStaker.waitForDeployment();

    // Set rewards recipient
    await cvxStaker.connect(owner).setRewardsRecipient(addr1.address);

    // Set CVX pool info
    await cvxStaker.connect(owner).setCvxPoolInfo(0, mockCLPToken.target, mockRewardPool.target);

    // Transfer some CLP tokens to CVXStaker for staking
    await mockCLPToken.transfer(cvxStaker.target, ethers.parseEther("100"));
  });

  it("should transfer reward tokens to rewards recipient after getReward when balance is non-zero", async function () {
    // Simulate reward tokens being sent to CVXStaker (as would happen after getReward call)
    const rewardAmount = ethers.parseEther("50");
    await mockRewardToken.transfer(cvxStaker.target, rewardAmount);

    // Get initial balance of rewards recipient
    const initialBalance = await mockRewardToken.balanceOf(addr1.address);
    expect(initialBalance).to.equal(0);

    // Call getReward - this should trigger the reward token transfer
    await cvxStaker.connect(owner).getReward(true);

    // Check that rewards recipient received the reward tokens
    const finalBalance = await mockRewardToken.balanceOf(addr1.address);
    expect(finalBalance).to.equal(rewardAmount);
  });
});