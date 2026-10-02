import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - _getReward zero amount", function () {
  it("should revert when trying to get reward with zero claimable amount", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Add a reward token
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    await instance.addReward(await rewardToken.getAddress());
    
    // Transfer some reward tokens to the distributor (owner) and notify reward
    await rewardToken.transfer(owner.address, ethers.parseEther("1000"));
    await rewardToken.connect(owner).approve(await instance.getAddress(), ethers.parseEther("1000"));
    await instance.connect(owner).notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("1000"));
    
    // Stake some tokens for addr1
    await stakingToken.transfer(addr1.address, ethers.parseEther("100"));
    await stakingToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));
    await instance.connect(addr1).stake(ethers.parseEther("100"));
    
    // Fast forward time to accumulate some rewards
    await ethers.provider.send("evm_increaseTime", [86400 * 7]); // 1 week
    await ethers.provider.send("evm_mine", []);
    
    // Now try to get reward for addr2 who has no stake and no claimable rewards
    // The original contract should handle this gracefully (no transfer)
    // The mutant with "if (true)" would attempt to transfer 0 tokens, which should revert
    await expect(
      instance.connect(addr2).getReward(addr2.address, await rewardToken.getAddress())
    ).to.be.reverted;
  });
});