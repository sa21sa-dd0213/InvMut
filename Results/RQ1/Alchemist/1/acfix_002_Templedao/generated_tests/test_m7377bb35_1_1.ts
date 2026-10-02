import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m7377bb35 (earned calculation)", function () {
  let stakingToken: any;
  let rewardToken: any;
  let staking: any;
  let owner: any;
  let user: any;
  let distributor: any;

  beforeEach(async function () {
    [owner, user, distributor] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const StakingFactory = await ethers.getContractFactory("StaxLPStaking");
    staking = await StakingFactory.deploy(await stakingToken.getAddress(), await distributor.getAddress());
    await staking.waitForDeployment();

    // Setup: transfer tokens and approve
    await stakingToken.transfer(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("1000"));

    await rewardToken.transfer(distributor.address, ethers.parseEther("10000"));
    await rewardToken.connect(distributor).approve(await staking.getAddress(), ethers.parseEther("10000"));

    // Add reward token
    await staking.addReward(await rewardToken.getAddress());
  });

  it("should correctly calculate earned rewards after claiming (kill mutant with wrong addition)", async function () {
    // User stakes tokens
    await staking.connect(user).stake(ethers.parseEther("100"));

    // Distributor notifies reward
    const rewardAmount = ethers.parseEther("1000");
    await staking.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);

    // Fast forward time to accrue rewards
    await ethers.provider.send("evm_increaseTime", [86400 * 7]); // 1 week
    await ethers.provider.send("evm_mine", []);

    // Check earned rewards before claiming
    const earnedBefore = await staking.earned(user.address, await rewardToken.getAddress());
    expect(earnedBefore).to.be.gt(0);

    // Claim rewards
    await staking.connect(user).getRewards(user.address);

    // After claiming, earned rewards should be zero or very close to zero
    const earnedAfter = await staking.earned(user.address, await rewardToken.getAddress());

    // In the original contract, after claiming, earned should be ~0
    // In the mutant, due to the + instead of -, earned will be inflated
    expect(earnedAfter).to.be.lt(ethers.parseEther("0.01")); // Should be ~0, mutant will show large value
  });
});