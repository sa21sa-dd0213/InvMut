import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m1bde1718 (leftover calculation)", function () {
  let stakingToken: any;
  let rewardToken: any;
  let staking: any;
  let owner: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock ERC20 tokens
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    stakingToken = await ERC20Factory.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    staking = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();

    // Fund addr1 with staking tokens
    await stakingToken.transfer(addr1.address, ethers.parseEther("1000"));
    // Fund owner with reward tokens
    await rewardToken.mint(owner.address, ethers.parseEther("10000"));
    // Approve staking contract to spend tokens
    await stakingToken.connect(addr1).approve(await staking.getAddress(), ethers.parseEther("1000"));
    await rewardToken.approve(await staking.getAddress(), ethers.parseEther("10000"));

    // Add reward token
    await staking.addReward(await rewardToken.getAddress());
  });

  it("should kill mutant by detecting incorrect leftover reward calculation when notifying rewards mid-period", async function () {
    const DURATION = 86400 * 7; // 7 days

    // Step 1: Stake tokens to have non-zero totalSupply
    await staking.connect(addr1).stake(ethers.parseEther("100"));
    
    // Step 2: Notify first reward (e.g., 1000 tokens for full period)
    const firstRewardAmount = ethers.parseEther("1000");
    await staking.notifyRewardAmount(await rewardToken.getAddress(), firstRewardAmount);
    
    // Get initial reward rate
    let rewardData = await staking.rewardData(await rewardToken.getAddress());
    const initialRewardRate = rewardData.rewardRate;
    
    // Step 3: Fast forward half the duration
    await ethers.provider.send("evm_increaseTime", [DURATION / 2]);
    await ethers.provider.send("evm_mine", []);
    
    // Step 4: Calculate expected leftover for original contract
    // remaining = periodFinish - currentTime = DURATION/2
    // leftover = remaining * rewardRate (original)
    // leftover_plus = remaining + rewardRate (mutant)
    const remaining = DURATION / 2;
    const originalLeftover = BigInt(remaining) * initialRewardRate;
    const mutantLeftover = BigInt(remaining) + initialRewardRate;
    
    // Step 5: Notify second reward (same amount)
    const secondRewardAmount = ethers.parseEther("1000");
    await staking.notifyRewardAmount(await rewardToken.getAddress(), secondRewardAmount);
    
    // Step 6: Get new reward rate after second notification
    rewardData = await staking.rewardData(await rewardToken.getAddress());
    const newRewardRate = rewardData.rewardRate;
    
    // Step 7: Calculate expected reward rate for original
    // Expected new rewardRate = (secondRewardAmount + leftover) / DURATION
    const expectedOriginalRate = (secondRewardAmount + originalLeftover) / BigInt(DURATION);
    // Expected mutant rewardRate = (secondRewardAmount + mutantLeftover) / DURATION
    const expectedMutantRate = (secondRewardAmount + mutantLeftover) / BigInt(DURATION);
    
    // The mutant will produce a different reward rate than the original
    // Assert that the new reward rate matches the ORIGINAL (correct) calculation
    expect(newRewardRate).to.equal(expectedOriginalRate);
    // This assertion will fail on the mutant because it uses addition instead of multiplication
    // causing the reward rate to be different
  });
});