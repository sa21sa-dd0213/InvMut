import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - mutant mbf935f41 test", function () {
  it("should not update claimableRewards or userRewardPerTokenPaid for address(0) when notifyRewardAmount is called", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock reward token
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();
    
    // Add reward token
    await instance.addReward(await rewardToken.getAddress());
    
    // Transfer reward tokens to owner and approve
    await rewardToken.transfer(owner.address, ethers.parseEther("1000"));
    await rewardToken.connect(owner).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Stake some tokens with addr1 to have totalSupply > 0
    await stakingToken.transfer(addr1.address, ethers.parseEther("100"));
    await stakingToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));
    await instance.connect(addr1).stake(ethers.parseEther("100"));
    
    // Notify reward amount - this calls updateReward with address(0)
    await instance.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("1000"));
    
    // Verify that claimableRewards for address(0) is still 0
    const zeroAddressRewards = await instance.claimableRewards(ethers.ZeroAddress, await rewardToken.getAddress());
    expect(zeroAddressRewards).to.equal(0);
    
    // Verify that userRewardPerTokenPaid for address(0) is still 0
    const zeroAddressPaid = await instance.userRewardPerTokenPaid(ethers.ZeroAddress, await rewardToken.getAddress());
    expect(zeroAddressPaid).to.equal(0);
    
    // Verify that the reward state was properly updated despite address(0) not being affected
    const rewardData = await instance.rewardData(await rewardToken.getAddress());
    expect(rewardData.rewardRate).to.be.gt(0);
    expect(rewardData.periodFinish).to.be.gt(0);
  });
});