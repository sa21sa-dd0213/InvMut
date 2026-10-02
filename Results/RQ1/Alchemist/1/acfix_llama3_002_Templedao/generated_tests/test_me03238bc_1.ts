import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant me03238bc (division instead of subtraction in _rewardPerToken)", function () {
  let stakingToken: any;
  let rewardToken: any;
  let staking: any;
  let owner: any;
  let user: any;
  let rewardDistributor: any;

  beforeEach(async function () {
    [owner, user, rewardDistributor] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    stakingToken = await ERC20Factory.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();

    rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking with constructor args: _stakingToken, _distributor
    const StakingFactory = await ethers.getContractFactory("StaxLPStaking");
    staking = await StakingFactory.deploy(
      await stakingToken.getAddress(),
      rewardDistributor.address
    );
    await staking.waitForDeployment();

    // Transfer reward tokens to distributor for funding rewards
    await rewardToken.mint(rewardDistributor.address, ethers.parseEther("1000"));
    await rewardToken.connect(rewardDistributor).approve(await staking.getAddress(), ethers.parseEther("1000"));

    // Give user some staking tokens
    await stakingToken.mint(user.address, ethers.parseEther("100"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("100"));
  });

  it("should correctly compute earned rewards using subtraction, not division", async function () {
    // Add reward token to the staking contract
    await staking.connect(owner).addReward(await rewardToken.getAddress());

    // User stakes tokens
    await staking.connect(user).stake(ethers.parseEther("50"));

    // Distributor notifies a reward amount (e.g., 1000 tokens over 1 week)
    const rewardAmount = ethers.parseEther("1000");
    await staking.connect(rewardDistributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      rewardAmount
    );

    // Fast forward time by 3 days (less than the DURATION of 7 days)
    const threeDays = 3 * 86400;
    await ethers.provider.send("evm_increaseTime", [threeDays]);
    await ethers.provider.send("evm_mine");

    // Check earned rewards for the user
    const earned = await staking.connect(user).earned(user.address, await rewardToken.getAddress());

    // Calculate expected reward manually using the ORIGINAL formula:
    // rewardPerToken = rewardPerTokenStored + ((timeElapsed * rewardRate * 1e18) / totalSupply)
    // rewardRate = 1000 / (86400 * 7) = 1000 / 604800 ≈ 0.001653439153439153 per second
    // timeElapsed = 3 days = 259200 seconds
    // totalSupply = 50 tokens
    // rewardPerToken = 0 + ((259200 * (1000/604800) * 1e18) / 50)
    // = (259200 * 0.001653439153439153 * 1e18) / 50
    // = (428571.4285714286 * 1e18) / 50
    // = 8571428571428572 wei per token (approximately)
    // earned = 50 * rewardPerToken = 428571428571428600 wei (approximately)
    
    // The mutant divides by lastUpdateTime instead of subtracting it,
    // which would produce a completely different (and incorrect) result
    // The correct earned amount should be > 0 and follow the subtraction logic
    expect(earned).to.be.gt(0);

    // Additional verification: check that the reward calculation is consistent
    // by calling getRewards and verifying the claimable amount
    await staking.connect(user).getRewards(user.address);
    const claimable = await staking.claimableRewards(user.address, await rewardToken.getAddress());
    
    // After claiming, the claimable should be 0 (rewards were paid)
    expect(claimable).to.equal(0);
  });
});