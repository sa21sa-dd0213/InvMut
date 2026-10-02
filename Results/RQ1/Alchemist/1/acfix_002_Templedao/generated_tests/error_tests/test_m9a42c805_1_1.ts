import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m9a42c805 (division replaced by addition in _rewardPerToken)", function () {
  let stakingToken: any;
  let rewardToken: any;
  let staking: any;
  let owner: any;
  let user: any;
  let distributor: any;

  beforeEach(async function () {
    [owner, user, distributor] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    stakingToken = await ERC20Factory.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();

    rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking with stakingToken and distributor
    const StakingFactory = await ethers.getContractFactory("StaxLPStaking");
    staking = await StakingFactory.deploy(
      await stakingToken.getAddress(),
      distributor.address
    );
    await staking.waitForDeployment();

    // Setup: fund user with staking tokens and approve
    await stakingToken.mint(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("1000"));

    // Setup: fund distributor with reward tokens and approve
    await rewardToken.mint(distributor.address, ethers.parseEther("1000"));
    await rewardToken.connect(distributor).approve(await staking.getAddress(), ethers.parseEther("1000"));

    // Add reward token to staking contract
    await staking.connect(owner).addReward(await rewardToken.getAddress());
  });

  it("should kill mutant by verifying rewardPerToken returns correct proportional value after staking and adding rewards", async function () {
    // User stakes 100 tokens
    const stakeAmount = ethers.parseEther("100");
    await staking.connect(user).stake(stakeAmount);

    // Distributor notifies reward of 1000 tokens (duration = 7 days)
    const rewardAmount = ethers.parseEther("1000");
    await staking.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      rewardAmount
    );

    // Advance time by 3.5 days (half of DURATION)
    const DURATION = 86400 * 7;
    await ethers.provider.send("evm_increaseTime", [DURATION / 2]);
    await ethers.provider.send("evm_mine", []);

    // Calculate expected rewardPerToken
    // Original formula: rewardPerTokenStored + ((timeElapsed * rewardRate * 1e18) / totalSupply)
    // timeElapsed = 3.5 days = DURATION/2 = 302400 seconds
    // rewardRate = 1000e18 / 604800 = ~1.652e15
    // expected = 0 + ((302400 * 1.652e15 * 1e18) / 100e18)
    // expected ≈ 500e18 (half of rewards distributed per token staked)
    const rewardPerToken = await staking.rewardPerToken(await rewardToken.getAddress());
    
    // The original should give a reasonable value around 5e20 (500 * 1e18)
    // The mutant would give: 0 + ((302400 * 1.652e15 * 1e18) + 100e18) which is astronomically larger
    // We verify it's within reasonable bounds (less than 1e25 which would indicate the mutant)
    expect(rewardPerToken).to.be.lessThan(ethers.parseEther("1000000")); // Mutant would produce huge value
    expect(rewardPerToken).to.be.gt(ethers.parseEther("100")); // Original should produce value > 100e18
  });
});