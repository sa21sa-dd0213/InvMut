import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - Mutant m506a01f9", function () {
  it("should revert when notifyRewardAmount is called from unauthorized address (not rewardDistributor)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking and rewards
    const MockToken = await ethers.getContractFactory("ERC20Mock");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking with owner as initial rewardDistributor
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Add reward token to the staking contract
    await instance.connect(owner).addReward(await rewardToken.getAddress());
    
    // Fund addr1 with reward tokens to attempt notifyRewardAmount
    await rewardToken.transfer(addr1.address, ethers.parseEther("1000"));
    await rewardToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Attempt to call notifyRewardAmount from unauthorized address (addr1)
    // Original contract should revert because addr1 is not rewardDistributor
    // Mutant would allow this call to succeed (killing the mutant)
    await expect(
      instance.connect(addr1).notifyRewardAmount(
        await rewardToken.getAddress(),
        ethers.parseEther("100")
      )
    ).to.be.revertedWith("not distributor");
  });
});