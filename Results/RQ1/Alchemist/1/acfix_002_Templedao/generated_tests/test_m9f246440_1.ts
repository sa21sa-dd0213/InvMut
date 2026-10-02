import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m9f246440 test", function () {
  it("should revert when rewardDistributor calls notifyRewardAmount due to mutated access control", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK");
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD");
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking with staking token and reward distributor set to addr1
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), addr1.address);
    await instance.waitForDeployment();
    
    // Owner adds the reward token to the staking contract
    await instance.connect(owner).addReward(await rewardToken.getAddress());
    
    // Transfer some reward tokens to addr1 so they can provide rewards
    await rewardToken.transfer(addr1.address, ethers.parseEther("1000"));
    await rewardToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // The reward distributor (addr1) attempts to call notifyRewardAmount
    // In the original contract this should succeed
    // In the mutant, it should revert because the condition is inverted (msg.sender != rewardDistributor)
    await expect(
      instance.connect(addr1).notifyRewardAmount(
        await rewardToken.getAddress(),
        ethers.parseEther("100")
      )
    ).to.be.revertedWith("not distributor");
  });
});