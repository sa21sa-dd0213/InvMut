import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - updateReward modifier", function () {
  let stakingToken: any;
  let rewardToken: any;
  let staking: any;
  let owner: any;
  let user: any;
  let distributor: any;

  beforeEach(async function () {
    [owner, user, distributor] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for staking and rewards
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    stakingToken = await ERC20Factory.deploy("Staking Token", "STK");
    await stakingToken.waitForDeployment();

    rewardToken = await ERC20Factory.deploy("Reward Token", "RWD");
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking with staking token and distributor
    const StakingFactory = await ethers.getContractFactory("StaxLPStaking");
    staking = await StakingFactory.deploy(
      await stakingToken.getAddress(),
      distributor.address
    );
    await staking.waitForDeployment();

    // Mint tokens to user for staking
    await stakingToken.mint(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(
      await staking.getAddress(),
      ethers.parseEther("1000")
    );

    // Add reward token and fund distributor
    await staking.connect(owner).addReward(await rewardToken.getAddress());
    await rewardToken.mint(distributor.address, ethers.parseEther("1000"));
    await rewardToken.connect(distributor).approve(
      await staking.getAddress(),
      ethers.parseEther("1000")
    );
  });

  it("should correctly update claimable rewards after staking and reward distribution", async function () {
    // User stakes tokens
    const stakeAmount = ethers.parseEther("100");
    await staking.connect(user).stake(stakeAmount);

    // Distributor notifies reward (e.g., 1000 tokens over 7 days)
    const rewardAmount = ethers.parseEther("1000");
    await staking.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      rewardAmount
    );

    // Fast forward time to earn some rewards (e.g., 3 days)
    await ethers.provider.send("evm_increaseTime", [86400 * 3]);
    await ethers.provider.send("evm_mine", []);

    // Check earned rewards before claiming
    const earnedBefore = await staking.earned(
      user.address,
      await rewardToken.getAddress()
    );

    // Claim rewards
    await staking.connect(user).getRewards(user.address);

    // Check user's reward token balance after claim
    const userBalance = await rewardToken.balanceOf(user.address);

    // In the original contract, earned rewards should be > 0 and transferred
    // In the mutant, claimable rewards remain 0, so user receives nothing
    expect(earnedBefore).to.be.gt(0);
    expect(userBalance).to.equal(earnedBefore);
  });
});