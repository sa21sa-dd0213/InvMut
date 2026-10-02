import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant test - updateReward modifier with address(0)", function () {
  it("should NOT update claimableRewards for address(0) when notifyRewardAmount is called", async function () {
    const [owner, distributor] = await ethers.getSigners();
    
    // Deploy a mock ERC20 for staking token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 for reward token
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();
    
    // Add reward token
    await instance.addReward(await rewardToken.getAddress());
    
    // Transfer reward tokens to distributor and approve
    await rewardToken.transfer(distributor.address, ethers.parseEther("1000"));
    await rewardToken.connect(distributor).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Check initial state of address(0) claimableRewards
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    const initialClaimable = await instance.claimableRewards(zeroAddress, await rewardToken.getAddress());
    const initialUserRewardPaid = await instance.userRewardPerTokenPaid(zeroAddress, await rewardToken.getAddress());
    
    expect(initialClaimable).to.equal(0);
    expect(initialUserRewardPaid).to.equal(0);
    
    // Call notifyRewardAmount which triggers updateReward(address(0))
    const rewardAmount = ethers.parseEther("100");
    await instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount);
    
    // Check that address(0) claimableRewards and userRewardPerTokenPaid are still 0
    // In the original code, _account != address(0) prevents updates for zero address
    // In the mutant with "true", it would incorrectly update these mappings
    const finalClaimable = await instance.claimableRewards(zeroAddress, await rewardToken.getAddress());
    const finalUserRewardPaid = await instance.userRewardPerTokenPaid(zeroAddress, await rewardToken.getAddress());
    
    expect(finalClaimable).to.equal(0);
    expect(finalUserRewardPaid).to.equal(0);
  });
});