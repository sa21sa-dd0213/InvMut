import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m71b5af47", function () {
  it("should kill mutant by verifying rewardPerToken increases after staking and time passes", async function () {
    const [owner, staker] = await ethers.getSigners();
    
    // Deploy a mock ERC20 for staking token and reward token
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK");
    await stakingToken.waitForDeployment();
    
    const rewardToken = await ERC20Factory.deploy("Reward Token", "RWD");
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking with staking token and reward distributor
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Add reward token
    await instance.addReward(await rewardToken.getAddress());
    
    // Mint staking tokens to staker and approve
    await stakingToken.mint(staker.address, ethers.parseEther("1000"));
    await stakingToken.connect(staker).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Stake tokens
    await instance.connect(staker).stake(ethers.parseEther("100"));
    
    // Get initial rewardPerToken value
    const initialRewardPerToken = await instance.rewardPerToken(await rewardToken.getAddress());
    
    // Notify reward (distribute rewards)
    await rewardToken.mint(owner.address, ethers.parseEther("1000"));
    await rewardToken.approve(await instance.getAddress(), ethers.parseEther("1000"));
    await instance.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("700"));
    
    // Advance time by 1 day (86400 seconds)
    await ethers.provider.send("evm_increaseTime", [86400]);
    await ethers.provider.send("evm_mine");
    
    // Get rewardPerToken after time has passed
    const updatedRewardPerToken = await instance.rewardPerToken(await rewardToken.getAddress());
    
    // In the original contract, rewardPerToken should increase because:
    // - totalSupply() > 0 (100 tokens staked)
    // - Time has passed since last update
    // - Reward rate is set
    // The mutant always returns rewardPerTokenStored without adding new rewards
    // So the mutant will return the same value (or very close) while original increases
    expect(updatedRewardPerToken).to.be.gt(initialRewardPerToken);
  });
});