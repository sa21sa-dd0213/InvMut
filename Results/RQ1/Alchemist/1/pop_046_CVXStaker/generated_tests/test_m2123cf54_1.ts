import { expect } from "chai";
import { ethers } } from "hardhat";

describe("CVXStaker - getReward mutant detection", function () {
  let owner: any;
  let operator: any;
  let addr1: any;
  let mockCLPToken: any;
  let mockBooster: any;
  let mockRewardPool: any;
  let mockRewardToken: any;
  let cvxStaker: any;
  let rewardsRecipient: any;

  beforeEach(async function () {
    [owner, operator, addr1] = await ethers.getSigners();
    rewardsRecipient = addr1;

    // Deploy mock ERC20 for CLP token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockCLPToken = await MockERC20.deploy("CLP Token", "CLP", 18);
    await mockCLPToken.waitForDeployment();

    // Deploy mock reward token
    mockRewardToken = await MockERC20.deploy("Reward Token", "RWD", 18);
    await mockRewardToken.waitForDeployment();

    // Deploy mock booster
    const MockBooster = await ethers.getContractFactory("MockBooster");
    mockBooster = await MockBooster.deploy();
    await mockBooster.waitForDeployment();

    // Deploy mock reward pool
    const MockRewardPool = await ethers.getContractFactory("MockRewardPool");
    mockRewardPool = await MockRewardPool.deploy();
    await mockRewardPool.waitForDeployment();

    // Setup booster pool info
    await mockBooster.setPoolInfo(0, {
      lptoken: mockCLPToken.target,
      token: ethers.ZeroAddress,
      gauge: ethers.ZeroAddress,
      crvRewards: mockRewardPool.target,
      stash: ethers.ZeroAddress,
      shutdown: false
    });

    // Deploy CVXStaker
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    cvxStaker = await CVXStaker.deploy(
      operator.address,
      mockCLPToken.target,
      mockBooster.target,
      [mockRewardToken.target]
    );
    await cvxStaker.waitForDeployment();

    // Set CVX pool info
    await cvxStaker.connect(owner).setCvxPoolInfo(
      0,
      mockCLPToken.target,
      mockRewardPool.target
    );

    // Set rewards recipient
    await cvxStaker.connect(owner).setRewardsRecipient(rewardsRecipient.address);

    // Mint some reward tokens to the reward pool and send to CVXStaker
    await mockRewardToken.mint(mockRewardPool.target, ethers.parseEther("100"));
    await mockRewardPool.setBalanceForAddress(cvxStaker.target, ethers.parseEther("100"));
    await mockRewardPool.setEarnedForAddress(cvxStaker.target, ethers.parseEther("50"));
  });

  it("should detect mutant that prevents reward transfer to recipient", async function () {
    // Get initial balance of rewards recipient
    const initialBalance = await mockRewardToken.balanceOf(rewardsRecipient.address);

    // Call getReward - this should trigger reward transfer to recipient
    await cvxStaker.connect(owner).getReward(false);

    // Get final balance of rewards recipient
    const finalBalance = await mockRewardToken.balanceOf(rewardsRecipient.address);

    // If mutant is present (if (false) instead of if (rewardsRecipient != address(0))),
    // the rewards will NOT be transferred, so balances will be equal
    // If original code, rewards SHOULD be transferred, so final balance > initial balance
    expect(finalBalance).to.be.gt(initialBalance);
  });
});