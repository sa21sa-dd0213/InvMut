import { expect } from "chai";
import { ethers } } from "hardhat";

describe("StaxLPStaking - mutant m2cb4687f", function () {
  let stakingToken: any;
  let rewardToken: any;
  let staking: any;
  let owner: any;
  let user: any;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for testing
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    stakingToken = await ERC20Factory.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    staking = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();

    // Add reward token
    await staking.connect(owner).addReward(await rewardToken.getAddress());

    // Fund user with staking tokens
    await stakingToken.mint(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("1000"));

    // Fund owner with reward tokens
    await rewardToken.mint(owner.address, ethers.parseEther("10000"));
    await rewardToken.connect(owner).approve(await staking.getAddress(), ethers.parseEther("10000"));
  });

  it("should kill mutant m2cb4687f by verifying reward state is updated before notifyRewardAmount", async function () {
    // First, stake some tokens to have non-zero totalSupply
    await staking.connect(user).stake(ethers.parseEther("100"));

    // Fast forward time to simulate reward accrual
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine", []);

    // Get the reward per token stored before calling notifyRewardAmount
    const rewardDataBefore = await staking.rewardData(await rewardToken.getAddress());
    const rewardPerTokenStoredBefore = rewardDataBefore.rewardPerTokenStored;

    // Notify a new reward amount - this should update reward state first
    await staking.connect(owner).notifyRewardAmount(
      await rewardToken.getAddress(),
      ethers.parseEther("1000")
    );

    // Get the reward data after notification
    const rewardDataAfter = await staking.rewardData(await rewardToken.getAddress());

    // In the original contract, rewardPerTokenStored should have been updated
    // to reflect the 1 hour of reward accrual before the new notification.
    // In the mutant (missing updateReward modifier), it will NOT be updated.
    const rewardPerTokenStoredAfter = rewardDataAfter.rewardPerTokenStored;

    // The mutant will have the same rewardPerTokenStored as before because
    // the updateReward modifier was removed, so the accrued rewards for the
    // past hour were not accounted for.
    // The original contract would have a higher rewardPerTokenStored.
    expect(rewardPerTokenStoredAfter).to.not.equal(rewardPerTokenStoredBefore);
  });
});