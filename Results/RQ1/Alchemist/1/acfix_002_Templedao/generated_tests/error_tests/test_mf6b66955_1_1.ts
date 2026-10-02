import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant mf6b66955 (RewardPaid event removal)", function () {
  let stakingToken: any;
  let rewardToken: any;
  let staking: any;
  let owner: any;
  let user: any;
  let rewardDistributor: any;

  beforeEach(async function () {
    [owner, user, rewardDistributor] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    stakingToken = await ERC20Factory.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    
    rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const StakingFactory = await ethers.getContractFactory("StaxLPStaking");
    staking = await StakingFactory.deploy(
      await stakingToken.getAddress(),
      await rewardDistributor.getAddress()
    );
    await staking.waitForDeployment();

    // Setup: transfer tokens to user and approve
    await stakingToken.transfer(await user.getAddress(), ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("1000"));
    
    // Transfer reward tokens to distributor and approve
    await rewardToken.transfer(await rewardDistributor.getAddress(), ethers.parseEther("10000"));
    await rewardToken.connect(rewardDistributor).approve(await staking.getAddress(), ethers.parseEther("10000"));

    // Add reward token
    await staking.addReward(await rewardToken.getAddress());
  });

  it("should emit RewardPaid event when claiming rewards (detects mutant that removes event emission)", async function () {
    // User stakes tokens
    await staking.connect(user).stake(ethers.parseEther("100"));
    
    // Notify reward amount (distributor adds rewards)
    await staking.connect(rewardDistributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      ethers.parseEther("1000")
    );

    // Fast forward time to accumulate rewards
    await ethers.provider.send("evm_increaseTime", [86400 * 7]); // 1 week
    await ethers.provider.send("evm_mine", []);

    // Claim rewards and expect RewardPaid event
    await expect(staking.connect(user).getRewards(await user.getAddress()))
      .to.emit(staking, "RewardPaid")
      .withArgs(
        await user.getAddress(), 
        await user.getAddress(), 
        await rewardToken.getAddress(), 
        ethers.parseEther("1000") // Full reward amount for 1 week
      );
  });
});