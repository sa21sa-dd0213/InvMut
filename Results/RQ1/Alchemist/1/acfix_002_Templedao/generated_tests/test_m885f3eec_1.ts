import { expect } from "chai";
import { ethers } } from "hardhat";

describe("StaxLPStaking mutant kill test - updateReward modifier", function () {
  it("should kill mutant m885f3eec by verifying reward accrual after staking and time passage", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", 18);
    await stakingToken.waitForDeployment();
    
    // Deploy a mock reward token
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", 18);
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await staking.waitForDeployment();
    
    // Add reward token and fund the contract
    await staking.addReward(await rewardToken.getAddress());
    
    // Transfer reward tokens to owner to distribute
    await rewardToken.mint(owner.address, ethers.parseEther("1000"));
    await rewardToken.connect(owner).approve(await staking.getAddress(), ethers.parseEther("1000"));
    
    // Notify reward amount - 100 tokens over 1 week
    await staking.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("100"));
    
    // Give addr1 some staking tokens
    await stakingToken.mint(addr1.address, ethers.parseEther("100"));
    await stakingToken.connect(addr1).approve(await staking.getAddress(), ethers.parseEther("100"));
    
    // addr1 stakes 100 tokens
    await staking.connect(addr1).stake(ethers.parseEther("100"));
    
    // Fast forward 3 days (half of the reward period)
    await ethers.provider.send("evm_increaseTime", [86400 * 3]);
    await ethers.provider.send("evm_mine");
    
    // Check earned rewards before claiming
    const earnedBefore = await staking.earned(addr1.address, await rewardToken.getAddress());
    
    // Claim rewards
    await staking.connect(addr1).getRewards(addr1.address);
    
    // Check the reward balance of addr1
    const rewardBalance = await rewardToken.balanceOf(addr1.address);
    
    // In the original contract, addr1 should have received approximately 3/7 of 100 tokens = ~42.857 tokens
    // In the mutant, due to the bug in updateReward, addr1's rewards won't be properly updated and they'll get 0 or wrong amount
    expect(rewardBalance).to.be.gt(0);
    expect(rewardBalance).to.be.closeTo(ethers.parseEther("42.857"), ethers.parseEther("0.1"));
    
    // Verify the earned amount before claiming was correct
    expect(earnedBefore).to.be.gt(0);
  });
});