import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant detection - m9b7a45dd", function () {
  it("should detect off-by-one error in updateReward modifier when rewardTokens array has elements", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy another ERC20 token for rewards
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();
    
    // Add reward token
    await staking.addReward(await rewardToken.getAddress());
    
    // Transfer staking tokens to addr1 and approve the staking contract
    await stakingToken.transfer(addr1.address, ethers.parseEther("100"));
    await stakingToken.connect(addr1).approve(await staking.getAddress(), ethers.parseEther("100"));
    
    // Fund reward distributor with reward tokens
    await rewardToken.transfer(owner.address, ethers.parseEther("1000"));
    await rewardToken.approve(await staking.getAddress(), ethers.parseEther("1000"));
    
    // Notify reward amount to start rewards
    await staking.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("1000"));
    
    // This stake operation should trigger updateReward modifier
    // In the mutant, the loop goes one iteration too many (i <= length instead of i < length)
    // causing an out-of-bounds access that will revert
    await expect(
      staking.connect(addr1).stake(ethers.parseEther("10"))
    ).to.not.be.reverted;
    
    // Verify the stake was successful
    expect(await staking.balanceOf(addr1.address)).to.equal(ethers.parseEther("10"));
  });
});