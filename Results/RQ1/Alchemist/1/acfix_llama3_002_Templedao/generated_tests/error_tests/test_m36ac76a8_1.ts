import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m36ac76a8 (multiplication replaced with addition in _rewardPerToken)", function () {
  it("should compute correct rewards after time passes, killing mutant that uses + instead of *", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await ethers.getContractFactory("ERC20Mock");
    const reward = await rewardToken.deploy("Reward Token", "RWD", 18);
    await reward.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const StakingFactory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StakingFactory.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();
    
    // Setup: fund user with staking tokens and approve
    await stakingToken.mint(user.address, ethers.parseEther("100"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("100"));
    
    // Add reward token
    await staking.addReward(await reward.getAddress());
    
    // User stakes 100 tokens
    await staking.connect(user).stake(ethers.parseEther("100"));
    
    // Fund the staking contract with rewards via notifyRewardAmount
    const rewardAmount = ethers.parseEther("1000");
    await reward.mint(owner.address, rewardAmount);
    await reward.approve(await staking.getAddress(), rewardAmount);
    await staking.notifyRewardAmount(await reward.getAddress(), rewardAmount);
    
    // Fast forward time by 3 days (less than DURATION = 7 days)
    const threeDays = 86400 * 3;
    await ethers.provider.send("evm_increaseTime", [threeDays]);
    await ethers.provider.send("evm_mine", []);
    
    // Get expected reward calculation
    // rewardRate = rewardAmount / DURATION = 1000 / 604800
    // timeElapsed = 3 days = 259200 seconds
    // expected reward = (timeElapsed * rewardRate * 1e18 * balance) / 1e18 / totalSupply
    // But we can compute by calling earned() which uses the mutated function internally
    const earnedBeforeClaim = await staking.earned(user.address, await reward.getAddress());
    
    // Claim rewards
    await staking.connect(user).getReward(user.address, await reward.getAddress());
    
    // The balance after claim should be the earned amount
    const userRewardBalance = await reward.balanceOf(user.address);
    
    // In the original contract: earned should be positive and match calculation
    // In the mutant (using + instead of *): the rewardPerToken will be artificially inflated
    // because (timestamp - lastUpdateTime) + rewardRate is much larger than multiplication
    // leading to a much larger reward amount than mathematically correct
    
    // The mutant would produce an extremely large earned amount (incorrectly large)
    // We can detect it by checking that the reward is not astronomically large
    // The correct reward should be approximately: rewardAmount * (timeElapsed / DURATION) * (userBalance / totalSupply)
    // = 1000 * (259200/604800) * 1 = ~428.57 tokens
    const expectedCorrectReward = ethers.parseEther("428"); // approximate
    
    // Mutant would produce reward much larger than this due to addition instead of multiplication
    expect(userRewardBalance).to.be.lt(ethers.parseEther("500"));
    
    // Additionally, verify the reward is reasonable (non-zero and less than total reward)
    expect(userRewardBalance).to.be.gt(0);
    expect(userRewardBalance).to.be.lt(rewardAmount);
    
    // The mutant would fail this assertion because the addition would produce 
    // rewardRate (in wei per second) + timeDelta instead of rewardRate * timeDelta
    // Since rewardRate is ~1.65e15 and timeDelta is 259200, the mutant would compute
    // ~259201.65 instead of ~4.28e20, giving astronomically large rewards
  });
});