import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - ma974816e", function () {
  it("should kill the mutant by verifying correct earned rewards calculation", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 for staking token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 for reward token
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking with staking token and owner as distributor
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(
      await stakingToken.getAddress(),
      owner.address
    );
    await staking.waitForDeployment();
    
    // Mint tokens to user for staking
    const stakeAmount = ethers.parseEther("100");
    await stakingToken.mint(user.address, stakeAmount);
    
    // User approves staking contract
    await stakingToken.connect(user).approve(
      await staking.getAddress(),
      stakeAmount
    );
    
    // Add reward token
    await staking.addReward(await rewardToken.getAddress());
    
    // User stakes tokens
    await staking.connect(user).stake(stakeAmount);
    
    // Mint rewards to distributor and notify
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.mint(owner.address, rewardAmount);
    await rewardToken.approve(await staking.getAddress(), rewardAmount);
    await staking.notifyRewardAmount(
      await rewardToken.getAddress(),
      rewardAmount
    );
    
    // Fast forward time to accumulate rewards
    await ethers.provider.send("evm_increaseTime", [86400 * 7]); // 1 week
    await ethers.provider.send("evm_mine");
    
    // Query earned rewards
    const earned = await staking.earned(
      user.address,
      await rewardToken.getAddress()
    );
    
    // In the original contract, with 100 tokens staked and 1000 reward over 1 week,
    // the reward per token should be ~10e18, and earned should be ~1000e18
    // The mutant would compute (100 + (10e18 - 0)) / 1e18 which is wrong
    // We expect a meaningful reward amount proportional to balance * rewardRate
    expect(earned).to.be.gt(0);
    
    // The original calculation should yield approximately rewardAmount
    // The mutant would yield an incorrect value far from expected
    const expectedEarned = ethers.parseEther("1000"); // Full reward amount since user has all stake
    expect(earned).to.be.closeTo(expectedEarned, ethers.parseEther("1"));
    
    // Verify that the calculation is correct by comparing with known formula
    // earned = (balance * (rewardPerToken - userRewardPerTokenPaid)) / 1e18
    const rewardPerToken = await staking.rewardPerToken(
      await rewardToken.getAddress()
    );
    const userRewardPerTokenPaid = await staking.userRewardPerTokenPaid(
      user.address,
      await rewardToken.getAddress()
    );
    const manualEarned = (stakeAmount * (rewardPerToken - userRewardPerTokenPaid)) / ethers.parseEther("1");
    expect(earned).to.equal(manualEarned);
  });
});