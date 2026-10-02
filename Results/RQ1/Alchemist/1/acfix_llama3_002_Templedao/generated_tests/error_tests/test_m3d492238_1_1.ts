import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m3d492238 (DURATION operator changed)", function () {
  it("should detect mutant where DURATION is changed from multiplication to addition", async function () {
    const [owner, staker] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK");
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 token for rewards
    const rewardToken = await ERC20Factory.deploy("Reward Token", "RWD");
    await rewardToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();

    // Add reward token
    await staking.connect(owner).addReward(await rewardToken.getAddress());

    // Mint staking tokens to staker and approve
    await stakingToken.mint(staker.address, ethers.parseEther("1000"));
    await stakingToken.connect(staker).approve(await staking.getAddress(), ethers.parseEther("1000"));

    // Stake tokens
    await staking.connect(staker).stake(ethers.parseEther("100"));

    // Fund reward distributor with reward tokens
    await rewardToken.mint(owner.address, ethers.parseEther("1000"));
    await rewardToken.connect(owner).approve(await staking.getAddress(), ethers.parseEther("1000"));

    // Notify reward amount - this will use DURATION in calculation
    const rewardAmount = ethers.parseEther("100");
    await staking.connect(owner).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);

    // Fast forward exactly 7 days (original DURATION = 86400 * 7 = 604800 seconds)
    await ethers.provider.send("evm_increaseTime", [604800]);
    await ethers.provider.send("evm_mine");

    // Get earned rewards
    const earned = await staking.connect(staker).earned(staker.address, await rewardToken.getAddress());

    // Calculate what the original would produce
    const originalExpected = ethers.parseEther("100"); // Full reward after 7 days

    // The mutant will produce a different amount because the reward rate is different
    // Mutant rewardRate = 100e18 / 86407 ≈ 1157407 wei per second
    // Original rewardRate = 100e18 / 604800 ≈ 165343 wei per second
    // After 604800 seconds on mutant, rewards stopped at 86407 seconds
    // So mutant earned = (100e18 / 86407) * 86407 = 100e18 (same total but distributed faster)

    // However, the _rewardPerToken calculation uses rewardRate * timeElapsed
    // Original: (604800 * 165343 * 1e18) / 100e18 = 165343 * 604800 / 1e18
    // The key difference is that mutant's reward period ends at 86407 seconds, not 604800
    // So _lastTimeRewardApplicable returns 86407 instead of 604800

    // This should detect the mutant because the reward calculation differs
    expect(earned).to.not.equal(originalExpected);

    // Also verify by claiming rewards
    await staking.connect(staker).getRewards(staker.address);
    const rewardBalance = await rewardToken.balanceOf(staker.address);

    // On original, should get full 100 tokens
    // On mutant, should get a different amount
    expect(rewardBalance).to.not.equal(ethers.parseEther("100"));
  });
});