import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Mutant m8e91bcee: getReward without updateReward modifier", function () {
  it("should fail on mutant when claiming rewards twice in a row without updateReward modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    
    // Deploy mock ERC20 token for rewards
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();
    
    // Setup: Add reward token and fund distributor
    await staking.addReward(await rewardToken.getAddress());
    await rewardToken.transfer(owner.address, ethers.parseEther("1000"));
    await rewardToken.approve(await staking.getAddress(), ethers.parseEther("1000"));
    
    // Notify reward amount
    const rewardAmount = ethers.parseEther("100");
    await staking.notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Stake tokens
    const stakeAmount = ethers.parseEther("1000");
    await stakingToken.transfer(addr1.address, stakeAmount);
    await stakingToken.connect(addr1).approve(await staking.getAddress(), stakeAmount);
    await staking.connect(addr1).stake(stakeAmount);
    
    // Advance time to accrue rewards
    await ethers.provider.send("evm_increaseTime", [86400 * 3]); // 3 days
    await ethers.provider.send("evm_mine", []);
    
    // First claim should succeed
    await staking.connect(addr1).getReward(addr1.address, await rewardToken.getAddress());
    
    // Get earned rewards after first claim
    const earnedAfterFirstClaim = await staking.earned(addr1.address, await rewardToken.getAddress());
    
    // Advance time a bit more
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine", []);
    
    // Second claim - in original contract this would properly update state and return correct rewards
    // In mutant (without updateReward modifier), the state is not updated, potentially causing issues
    await staking.connect(addr1).getReward(addr1.address, await rewardToken.getAddress());
    
    // Check if the mutant fails to properly track rewards
    // The earned() function uses _balances[addr1] which should still be valid
    // But the mutant doesn't update userRewardPerTokenPaid and claimableRewards
    const finalEarned = await staking.earned(addr1.address, await rewardToken.getAddress());
    
    // In the original contract, after claiming twice, the earned amount should be based on fresh state
    // In the mutant, the second claim didn't update state, so this assertion would detect the difference
    // The mutant would have incorrect reward tracking
    expect(earnedAfterFirstClaim).to.be.lt(rewardAmount);
    
    // This assertion should fail on mutant because without updateReward modifier,
    // the reward state is not properly updated after claims
    const balanceOfUser = await rewardToken.balanceOf(addr1.address);
    expect(balanceOfUser).to.be.gt(0);
  });
});