import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant test - DURATION exponentiation bug", function () {
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

    // Deploy StaxLPStaking with constructor arguments
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    staking = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await staking.waitForDeployment();

    // Transfer ownership and set reward distributor
    // Owner is already the deployer
    // Add reward token
    await staking.connect(owner).addReward(await rewardToken.getAddress());

    // Fund user with staking tokens
    await stakingToken.mint(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("1000"));

    // Fund distributor with reward tokens
    await rewardToken.mint(distributor.address, ethers.parseEther("10000"));
    await rewardToken.connect(distributor).approve(await staking.getAddress(), ethers.parseEther("10000"));
  });

  it("should distribute rewards after staking and notifyRewardAmount", async function () {
    // User stakes 100 tokens
    await staking.connect(user).stake(ethers.parseEther("100"));

    // Distributor notifies reward of 1000 tokens
    await staking.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      ethers.parseEther("1000")
    );

    // Advance time by 3 days (half of the reward period)
    await ethers.provider.send("evm_increaseTime", [86400 * 3]);
    await ethers.provider.send("evm_mine");

    // Check earned rewards - should be > 0 in original, but 0 in mutant
    const earned = await staking.earned(user.address, await rewardToken.getAddress());
    
    // The original contract would give approximately 428.57 tokens (1000 * 3/7)
    // The mutant with DURATION = 86400**7 would give 0 because rewardRate = 0
    expect(earned).to.be.gt(0);
  });
});