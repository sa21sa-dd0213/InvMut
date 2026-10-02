import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant detection - m193fef89", function () {
  it("should detect mutant that disables reward claiming during withdrawal", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking and rewards
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();

    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();

    // Setup: Add reward token and fund distributor
    await staking.connect(owner).addReward(await rewardToken.getAddress());
    await rewardToken.mint(owner.address, ethers.parseEther("1000"));
    await rewardToken.connect(owner).approve(await staking.getAddress(), ethers.parseEther("1000"));

    // Fund user with staking tokens
    await stakingToken.mint(user.address, ethers.parseEther("100"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("100"));

    // User stakes tokens
    await staking.connect(user).stake(ethers.parseEther("50"));

    // Distribute rewards
    await staking.connect(owner).notifyRewardAmount(
      await rewardToken.getAddress(),
      ethers.parseEther("100")
    );

    // Fast forward time to accumulate rewards
    await ethers.provider.send("evm_increaseTime", [86400 * 7]); // One full duration
    await ethers.provider.send("evm_mine", []);

    // Record user's reward token balance before withdrawal
    const rewardBalanceBefore = await rewardToken.balanceOf(user.address);

    // User withdraws all with claim = true
    await staking.connect(user).withdrawAll(true);

    // Check that rewards were claimed (should be > 0 on original, 0 on mutant)
    const rewardBalanceAfter = await rewardToken.balanceOf(user.address);

    // On original: rewards are claimed, so balance increases
    // On mutant: claimRewards is hardcoded to false, so balance stays the same
    expect(rewardBalanceAfter).to.be.gt(rewardBalanceBefore);
  });
});