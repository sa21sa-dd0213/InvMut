import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant kill test - getReward balance check", function () {
  it("should detect mutant where balance != 0 is replaced with balance == 0", async function () {
    const [owner, operator, rewardsRecipient] = await ethers.getSigners();

    // Deploy mock reward token
    const RewardTokenFactory = await ethers.getContractFactory("MockERC20");
    const rewardToken = await RewardTokenFactory.deploy("Reward", "RWD", 18);
    await rewardToken.waitForDeployment();

    // Deploy mock CLP token
    const CLPTokenFactory = await ethers.getContractFactory("MockERC20");
    const clpToken = await CLPTokenFactory.deploy("CLP", "CLP", 18);
    await clpToken.waitForDeployment();

    // Deploy mock booster
    const BoosterFactory = await ethers.getContractFactory("MockBooster");
    const booster = await BoosterFactory.deploy();
    await booster.waitForDeployment();

    // Deploy mock reward pool
    const RewardPoolFactory = await ethers.getContractFactory("MockRewardPool");
    const rewardPool = await RewardPoolFactory.deploy(await rewardToken.getAddress());
    await rewardPool.waitForDeployment();

    // Setup booster pool info
    await booster.setPoolInfo(0, {
      lptoken: await clpToken.getAddress(),
      token: await clpToken.getAddress(),
      gauge: ethers.ZeroAddress,
      crvRewards: ethers.ZeroAddress,
      stash: ethers.ZeroAddress,
      shutdown: false
    });

    // Deploy CVXStaker
    const rewardTokens = [await rewardToken.getAddress()];
    const CVXStakerFactory = await ethers.getContractFactory("CVXStaker");
    const cvxStaker = await CVXStakerFactory.deploy(
      operator.address,
      await clpToken.getAddress(),
      await booster.getAddress(),
      rewardTokens
    );
    await cvxStaker.waitForDeployment();

    // Setup CVX pool info
    await cvxStaker.connect(owner).setCvxPoolInfo(
      0,
      await clpToken.getAddress(),
      await rewardPool.getAddress()
    );

    // Set rewards recipient
    await cvxStaker.connect(owner).setRewardsRecipient(rewardsRecipient.address);

    // Fund reward pool with reward tokens and make it reward the CVXStaker contract
    await rewardToken.mint(await rewardPool.getAddress(), ethers.parseEther("100"));
    await rewardPool.setBalance(await cvxStaker.getAddress(), ethers.parseEther("50"));

    // Call getReward - this should transfer reward tokens to rewardsRecipient in original
    await cvxStaker.connect(operator).getReward(true);

    // Check if rewards were transferred to rewardsRecipient
    const recipientBalance = await rewardToken.balanceOf(rewardsRecipient.address);

    // In original: recipientBalance > 0 (rewards transferred)
    // In mutant: recipientBalance == 0 (transfer skipped because condition is reversed)
    expect(recipientBalance).to.be.gt(0);
  });
});