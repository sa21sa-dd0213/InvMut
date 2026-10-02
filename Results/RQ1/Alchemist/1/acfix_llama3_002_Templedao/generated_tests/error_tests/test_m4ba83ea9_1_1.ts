import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant detection - m4ba83ea9", function () {
  let stakingToken: any;
  let rewardToken: any;
  let staking: any;
  let owner: any;
  let user: any;
  let distributor: any;

  beforeEach(async function () {
    [owner, user, distributor] = await ethers.getSigners();

    // Deploy a mock ERC20 for staking token
    const ERC20Factory = await ethers.getContractFactory("contracts/mocks/ERC20Mock.sol:ERC20Mock");
    stakingToken = await ERC20Factory.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 for reward token
    rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const StakingFactory = await ethers.getContractFactory("StaxLPStaking");
    staking = await StakingFactory.deploy(await stakingToken.getAddress(), distributor.address);
    await staking.waitForDeployment();

    // Transfer some staking tokens to user
    await stakingToken.transfer(user.address, ethers.parseEther("1000"));
    // Transfer reward tokens to distributor
    await rewardToken.transfer(distributor.address, ethers.parseEther("1000"));
    
    // Set up reward token in staking contract
    await staking.connect(owner).addReward(await rewardToken.getAddress());
    
    // Approve staking tokens
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("1000"));
    await rewardToken.connect(distributor).approve(await staking.getAddress(), ethers.parseEther("1000"));
  });

  it("should detect mutant by verifying earned rewards increase with claimable rewards accumulation", async function () {
    // User stakes tokens
    await staking.connect(user).stake(ethers.parseEther("100"));
    
    // Distributor adds reward
    await staking.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      ethers.parseEther("1000")
    );
    
    // Fast forward time to accumulate some rewards
    await ethers.provider.send("evm_increaseTime", [86400 * 3]); // 3 days
    await ethers.provider.send("evm_mine", []);
    
    // Check earned rewards - first call creates claimable rewards
    const earned1 = await staking.connect(user).earned(user.address, await rewardToken.getAddress());
    expect(earned1).to.be.gt(0, "Should have earned some rewards");
    
    // User claims rewards (this will store them in claimableRewards and reset userRewardPerTokenPaid)
    await staking.connect(user).getRewards(user.address);
    
    // Fast forward more time to accumulate additional rewards
    await ethers.provider.send("evm_increaseTime", [86400 * 2]); // 2 more days
    await ethers.provider.send("evm_mine", []);
    
    // Check earned rewards again - should be greater than the first earned amount
    // because it includes both new rewards AND the previously stored claimable rewards
    const earned2 = await staking.connect(user).earned(user.address, await rewardToken.getAddress());
    
    // In the original contract: earned2 should be >= earned1 (adding new rewards to stored claimable)
    // In the mutant: earned2 will be LESS than earned1 (subtracting stored claimable instead of adding)
    expect(earned2).to.be.gte(earned1, "Earned rewards should not decrease after claiming and re-accumulating");
  });
});