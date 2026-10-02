import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Mutant mdff53176 detection", function () {
  it("should detect the mutant by testing reward rate calculation with amount equal to DURATION", async function () {
    const [owner, distributor, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 for staking token
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 for reward token
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();
    
    // Add reward token
    await instance.connect(owner).addReward(await rewardToken.getAddress());
    
    // Calculate DURATION constant (86400 * 7 = 604800)
    const DURATION = 604800n;
    
    // Transfer reward tokens to distributor and approve
    const rewardAmount = DURATION; // Exactly equal to DURATION
    await rewardToken.mint(distributor.address, rewardAmount);
    await rewardToken.connect(distributor).approve(await instance.getAddress(), rewardAmount);
    
    // Set reward distributor
    await instance.connect(owner).setRewardDistributor(distributor.address);
    
    // Stake some tokens first to have non-zero totalSupply for reward calculation
    await stakingToken.mint(user.address, ethers.parseEther("100"));
    await stakingToken.connect(user).approve(await instance.getAddress(), ethers.parseEther("100"));
    await instance.connect(user).stake(ethers.parseEther("10"));
    
    // Call notifyRewardAmount with amount = DURATION
    // In original: rewardRate = DURATION / DURATION = 1
    // In mutant: rewardRate = DURATION - DURATION = 0
    await instance.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      rewardAmount
    );
    
    // Get the reward data to check the rewardRate
    const rewardData = await instance.rewardData(await rewardToken.getAddress());
    
    // In the original contract, rewardRate should be 1 (DURATION / DURATION)
    // In the mutant, rewardRate should be 0 (DURATION - DURATION)
    // This difference will cause the reward calculation to behave differently
    // We can verify by checking rewardPerToken after some time
    
    // Wait for 1 second to ensure time passes
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);
    
    const rewardPerToken = await instance.rewardPerToken(await rewardToken.getAddress());
    
    // In original: rewardPerToken = 0 + ((1 - 0) * 1 * 1e18) / totalSupply > 0
    // In mutant: rewardPerToken = 0 + ((1 - 0) * 0 * 1e18) / totalSupply = 0
    // So if rewardPerToken is 0, the mutant is detected
    
    // The test passes if the reward rate calculation matches original behavior
    // If the mutant is present, rewardRate will be 0 and rewardPerToken will be 0
    expect(rewardPerToken).to.not.equal(0);
  });
});