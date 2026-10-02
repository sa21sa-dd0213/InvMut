import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Mutant m7377bb35 Detection", function () {
  let stakingToken: any;
  let rewardToken: any;
  let staking: any;
  let owner: any;
  let user: any;
  let distributor: any;

  beforeEach(async function () {
    [owner, user, distributor] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for staking and rewards
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    stakingToken = await ERC20Factory.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    
    rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const StakingFactory = await ethers.getContractFactory("StaxLPStaking");
    staking = await StakingFactory.deploy(await stakingToken.getAddress(), await distributor.getAddress());
    await staking.waitForDeployment();

    // Setup: Mint tokens and approve
    await stakingToken.mint(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("1000"));
    
    await rewardToken.mint(distributor.address, ethers.parseEther("10000"));
    await rewardToken.connect(distributor).approve(await staking.getAddress(), ethers.parseEther("10000"));

    // Add reward token to staking contract
    await staking.addReward(await rewardToken.getAddress());
  });

  it("should correctly calculate earned rewards after claiming (detect mutant that adds instead of subtracts userRewardPerTokenPaid)", async function () {
    // Step 1: User stakes tokens
    await staking.connect(user).stake(ethers.parseEther("100"));
    
    // Step 2: Notify reward (distributor sends rewards)
    const rewardAmount = ethers.parseEther("1000");
    await staking.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      rewardAmount
    );

    // Step 3: Advance time to accumulate rewards
    await ethers.provider.send("evm_increaseTime", [86400 * 7]); // One full reward period
    await ethers.provider.send("evm_mine", []);

    // Step 4: Get rewards (this should update userRewardPerTokenPaid and claim rewards)
    await staking.connect(user).getRewards(user.address);

    // Step 5: Check that claimable rewards are now zero
    const claimableAfterClaim = await staking.claimableRewards(user.address, await rewardToken.getAddress());
    expect(claimableAfterClaim).to.equal(0);

    // Step 6: Check earned() returns 0 after claiming (mutant would return positive value)
    const earnedAfterClaim = await staking.earned(user.address, await rewardToken.getAddress());
    
    // In the original contract, earned should be 0 after claiming
    // In the mutant, earned would be positive because it adds userRewardPerTokenPaid instead of subtracting
    expect(earnedAfterClaim).to.equal(0, "Mutant should have failed: earned should be 0 after claiming rewards");
  });
});