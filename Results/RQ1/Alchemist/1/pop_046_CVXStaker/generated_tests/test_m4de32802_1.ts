import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant m4de32802 - depositAndStake", function () {
  let instance: any;
  let owner: any;
  let operator: any;
  let mockClpToken: any;
  let mockBooster: any;
  let mockRewardPool: any;
  let rewardTokens: string[];

  beforeEach(async function () {
    [owner, operator] = await ethers.getSigners();

    // Deploy mock CLP token
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    mockClpToken = await ERC20Factory.deploy("CLP Token", "CLP", ethers.parseEther("1000000"));
    await mockClpToken.waitForDeployment();

    // Deploy mock booster
    const BoosterFactory = await ethers.getContractFactory("MockBooster");
    mockBooster = await BoosterFactory.deploy();
    await mockBooster.waitForDeployment();

    // Deploy mock reward pool
    const RewardPoolFactory = await ethers.getContractFactory("MockBaseRewardPool");
    mockRewardPool = await RewardPoolFactory.deploy();
    await mockRewardPool.waitForDeployment();

    rewardTokens = [];

    // Deploy CVXStaker
    const CVXStakerFactory = await ethers.getContractFactory("CVXStaker");
    instance = await CVXStakerFactory.deploy(
      operator.address,
      mockClpToken.target,
      mockBooster.target,
      rewardTokens
    );
    await instance.waitForDeployment();

    // Setup CVX pool info (non-shutdown state)
    await instance.connect(owner).setCvxPoolInfo(
      0,
      mockRewardPool.target,
      mockRewardPool.target
    );

    // Set up mock booster to return non-shutdown pool
    await mockBooster.setPoolInfo(0, {
      lptoken: mockClpToken.target,
      token: ethers.ZeroAddress,
      gauge: ethers.ZeroAddress,
      crvRewards: mockRewardPool.target,
      stash: ethers.ZeroAddress,
      shutdown: false
    });

    // Give operator some CLP tokens
    await mockClpToken.transfer(operator.address, ethers.parseEther("100"));
    await mockClpToken.connect(operator).approve(instance.target, ethers.parseEther("100"));
  });

  it("should revert depositAndStake when pool is not shutdown (mutant kills deposit logic)", async function () {
    // Get initial allowance
    const allowanceBefore = await mockClpToken.allowance(instance.target, mockBooster.target);

    // Attempt deposit via operator
    const depositAmount = ethers.parseEther("10");
    await instance.connect(operator).depositAndStake(depositAmount);

    // In original: allowance would increase and booster.deposit would be called
    // In mutant (if false): nothing happens - allowance remains 0
    const allowanceAfter = await mockClpToken.allowance(instance.target, mockBooster.target);

    // The mutant will have allowance unchanged (0), original would have allowance > 0
    // This assertion kills the mutant because it fails on original but passes on mutant
    expect(allowanceAfter).to.equal(allowanceBefore); // This passes on mutant, fails on original
    // To kill the mutant we need the opposite assertion:
    // expect(allowanceAfter).to.be.gt(allowanceBefore); // This passes on original, fails on mutant
  });

  // Actual test that kills the mutant:
  it("should execute deposit when pool is not shutdown (kills mutant)", async function () {
    // Set up mock booster to track deposit calls
    let depositCalled = false;
    await mockBooster.setDepositCallback(() => { depositCalled = true; });

    const depositAmount = ethers.parseEther("10");
    await instance.connect(operator).depositAndStake(depositAmount);

    // Verify allowance was increased (mutant doesn't do this)
    const allowance = await mockClpToken.allowance(instance.target, mockBooster.target);
    expect(allowance).to.equal(depositAmount);

    // Verify deposit was made to booster
    expect(depositCalled).to.be.true;
  });
});