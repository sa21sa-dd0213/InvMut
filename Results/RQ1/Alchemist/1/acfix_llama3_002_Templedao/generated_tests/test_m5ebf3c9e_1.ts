import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - _earned division replaced with subtraction", function () {
  it("should detect the mutant by verifying correct reward calculation after staking and reward notification", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();
    
    // Add reward token
    await staking.addReward(await rewardToken.getAddress());
    
    // Transfer staking tokens to user and approve staking contract
    await stakingToken.transfer(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await staking.getAddress(), ethers.parseEther("1000"));
    
    // Transfer reward tokens to owner (distributor) and approve staking contract
    await rewardToken.transfer(owner.address, ethers.parseEther("10000"));
    await rewardToken.approve(await staking.getAddress(), ethers.parseEther("10000"));
    
    // User stakes 100 tokens
    await staking.connect(user).stake(ethers.parseEther("100"));
    
    // Owner notifies a reward of 1000 tokens over the DURATION (7 days)
    await staking.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("1000"));
    
    // Calculate expected reward after 1 second
    // rewardRate = 1000 / DURATION = 1000 / 604800 ≈ 0.001653
    // rewardPerToken increase = (1 * rewardRate * 1e18) / totalSupply = (1 * 0.001653 * 1e18) / 100 ≈ 1.653e13
    // earned = (balance * (rewardPerToken - userRewardPerTokenPaid)) / 1e18 + claimableRewards
    // Initially: userRewardPerTokenPaid = 0, claimableRewards = 0
    // After 1 second: rewardPerToken ≈ 1.653e13
    // earned = (100e18 * 1.653e13) / 1e18 = 1.653e15 (approximately 0.001653 tokens)
    
    // Mine 1 second forward
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);
    
    // Get the earned amount
    const earnedAmount = await staking.earned(user.address, await rewardToken.getAddress());
    
    // The earned amount should be approximately 0.001653 tokens (1.653e15 wei)
    // With the mutant (subtraction instead of division), the calculation would be:
    // (100e18 * (rewardPerToken - 0)) - 1e18 + 0 = (100e18 * 1.653e13) - 1e18 ≈ 1.653e33 - 1e18
    // This would be astronomically larger than the correct value
    
    // Verify the earned amount is reasonable (in the range of 1e15 to 1e16 wei for 1 second)
    expect(earnedAmount).to.be.gt(ethers.parseEther("0.001"));
    expect(earnedAmount).to.be.lt(ethers.parseEther("0.01"));
    
    // The mutant would produce a value that fails this assertion
    // Let's also verify by claiming rewards and checking the actual transfer
    const userBalanceBefore = await rewardToken.balanceOf(user.address);
    
    // Get rewards for the user
    await staking.connect(user).getRewards(user.address);
    
    const userBalanceAfter = await rewardToken.balanceOf(user.address);
    const rewardClaimed = userBalanceAfter - userBalanceBefore;
    
    // The claimed reward should match the earned amount
    expect(rewardClaimed).to.equal(earnedAmount);
    
    // With the mutant, the claimed amount would be astronomically large
    // and would likely revert due to insufficient balance in the contract
  });
});