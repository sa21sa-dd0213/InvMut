import { expect } from "chai";
import { ethers } from "hardhat";

describe("CVXStaker mutant mdfed08d7 - getReward with rewardsRecipient = address(0)", function () {
  it("should not transfer rewards when rewardsRecipient is address(0) - kills mutant that removes zero address check", async function () {
    const [owner, operator, user] = await ethers.getSigners();

    // Deploy mock contracts for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockClpToken = await MockERC20.deploy("CLP", "CLP", ethers.parseEther("1000000"));
    await mockClpToken.waitForDeployment();

    const mockRewardToken = await MockERC20.deploy("RWD", "RWD", ethers.parseEther("1000000"));
    await mockRewardToken.waitForDeployment();

    // Deploy mock booster
    const MockBooster = await ethers.getContractFactory("MockBooster");
    const mockBooster = await MockBooster.deploy();
    await mockBooster.waitForDeployment();

    // Deploy mock reward pool
    const MockRewardPool = await ethers.getContractFactory("MockRewardPool");
    const mockRewardPool = await MockRewardPool.deploy(await mockRewardToken.getAddress());
    await mockRewardPool.waitForDeployment();

    // Setup booster with pool info
    const poolInfo = {
      lptoken: await mockClpToken.getAddress(),
      token: ethers.ZeroAddress,
      gauge: ethers.ZeroAddress,
      crvRewards: ethers.ZeroAddress,
      stash: ethers.ZeroAddress,
      shutdown: false
    };
    await mockBooster.setPoolInfo(0, poolInfo);

    // Deploy CVXStaker with rewardsRecipient = address(0)
    const rewardTokens = [await mockRewardToken.getAddress()];
    const CVXStaker = await ethers.getContractFactory("CVXStaker");
    const staker = await CVXStaker.deploy(
      await operator.getAddress(),
      await mockClpToken.getAddress(),
      await mockBooster.getAddress(),
      rewardTokens
    );
    await staker.waitForDeployment();

    // Set up the CVX pool info
    await staker.connect(owner).setCvxPoolInfo(
      0,
      await mockClpToken.getAddress(),
      await mockRewardPool.getAddress()
    );

    // Fund the reward pool with reward tokens
    await mockRewardToken.transfer(await mockRewardPool.getAddress(), ethers.parseEther("1000"));

    // Have the reward pool give rewards to the staker
    await mockRewardPool.addRewards(await staker.getAddress(), ethers.parseEther("500"));

    // Verify rewardsRecipient is address(0)
    expect(await staker.rewardsRecipient()).to.equal(ethers.ZeroAddress);

    // Get initial balance of reward tokens for address(0) - should be 0
    const zeroAddressBalanceBefore = await mockRewardToken.balanceOf(ethers.ZeroAddress);

    // Call getReward - in original, this should NOT transfer to address(0)
    // In mutant with true, it will try to transfer to address(0) and revert
    await staker.connect(operator).getReward(false);

    // Check that no tokens were transferred to address(0)
    const zeroAddressBalanceAfter = await mockRewardToken.balanceOf(ethers.ZeroAddress);
    expect(zeroAddressBalanceAfter).to.equal(zeroAddressBalanceBefore);

    // Verify the rewards are still in the staker contract (since no recipient)
    const stakerBalance = await mockRewardToken.balanceOf(await staker.getAddress());
    expect(stakerBalance).to.be.gt(0);
  });
});