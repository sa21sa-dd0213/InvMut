import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Kill mutant m71b5af47", function () {
  it("should kill mutant that always returns rewardPerTokenStored without accumulating rewards", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockTokenFactory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockTokenFactory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock reward token
    const rewardToken = await MockTokenFactory.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking with required constructor arguments
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Add reward token
    await instance.addReward(await rewardToken.getAddress());
    
    // Transfer staking tokens to user and stake
    await stakingToken.transfer(user.address, ethers.parseEther("1000"));
    await stakingToken.connect(user).approve(await instance.getAddress(), ethers.parseEther("1000"));
    await instance.connect(user).stake(ethers.parseEther("1000"));
    
    // Get initial rewardPerToken value
    const initialRewardPerToken = await instance.rewardPerToken(await rewardToken.getAddress());
    
    // Transfer rewards to owner and notify reward
    await rewardToken.transfer(owner.address, ethers.parseEther("1000"));
    await rewardToken.approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Notify reward amount (only owner is rewardDistributor initially)
    await instance.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("1000"));
    
    // Advance time to allow rewards to accumulate
    await ethers.provider.send("evm_increaseTime", [86400]); // 1 day
    await ethers.provider.send("evm_mine");
    
    // Get rewardPerToken after rewards have been accruing
    const updatedRewardPerToken = await instance.rewardPerToken(await rewardToken.getAddress());
    
    // In the original contract, rewardPerToken should have increased because totalSupply > 0
    // and rewards were added. In the mutant, rewardPerToken will return only the stored value
    // (which was updated in the modifier, but not with the accumulated rewards calculation)
    // The mutant returns rewardData[token].rewardPerTokenStored without adding the new rewards
    // accumulated since last update, so it will be less than expected.
    expect(updatedRewardPerToken).to.be.gt(initialRewardPerToken);
  });
});