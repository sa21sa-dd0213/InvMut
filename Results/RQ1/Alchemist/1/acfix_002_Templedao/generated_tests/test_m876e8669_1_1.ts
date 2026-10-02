import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant m876e8669", function () {
  it("should detect mutant that always treats reward period as finished", async function () {
    const [owner, distributor, staker] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), distributor.address);
    await staking.waitForDeployment();
    
    // Setup: fund distributor with reward tokens
    await rewardToken.mint(distributor.address, ethers.parseEther("1000"));
    
    // Setup: add reward token
    await staking.connect(owner).addReward(await rewardToken.getAddress());
    
    // Setup: stake some tokens so totalSupply > 0
    await stakingToken.mint(staker.address, ethers.parseEther("100"));
    await stakingToken.connect(staker).approve(await staking.getAddress(), ethers.parseEther("100"));
    await staking.connect(staker).stake(ethers.parseEther("100"));
    
    // First reward notification - start a reward period
    await rewardToken.connect(distributor).approve(await staking.getAddress(), ethers.parseEther("700"));
    await staking.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("700"));
    
    // Immediately notify another reward before period ends (simulate ongoing period)
    await rewardToken.connect(distributor).approve(await staking.getAddress(), ethers.parseEther("700"));
    await staking.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("700"));
    
    // Get the reward rate after second notification
    const rewardData2 = await staking.rewardData(await rewardToken.getAddress());
    const rewardRate2 = rewardData2.rewardRate;
    
    const DURATION = BigInt(86400 * 7); // 7 days in seconds
    const expectedRateWithLeftover = (ethers.parseEther("700") * BigInt(2)) / DURATION; // ~1400e18 / DURATION
    const expectedRateWithoutLeftover = ethers.parseEther("700") / DURATION; // ~700e18 / DURATION
    
    // The mutant will always take the first branch, so rewardRate = 700e18 / DURATION
    // The original would take the second branch, so rewardRate = (700e18 + leftover) / DURATION
    // where leftover = remaining * oldRewardRate
    
    // Assert that the reward rate is NOT the mutant value (which is too low)
    expect(rewardRate2).to.not.equal(expectedRateWithoutLeftover);
  });
});