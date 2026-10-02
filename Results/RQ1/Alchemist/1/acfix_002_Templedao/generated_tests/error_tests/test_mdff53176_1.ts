import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant mdff53176", function () {
  it("should revert when notifyRewardAmount is called with amount less than DURATION (kills subtraction mutant)", async function () {
    const [owner, distributor, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for staking and rewards
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    const rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking with staking token and distributor
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const instance = await StaxLPStaking.deploy(await stakingToken.getAddress(), await distributor.getAddress());
    await instance.waitForDeployment();

    // Add reward token
    await instance.connect(owner).addReward(await rewardToken.getAddress());

    // Transfer reward tokens to distributor for funding
    await rewardToken.connect(owner).transfer(await distributor.getAddress(), ethers.parseEther("1000"));

    // Approve contract to spend distributor's reward tokens
    await rewardToken.connect(distributor).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Try to notify reward with amount (100 tokens) less than DURATION (604800 seconds)
    // Original: _amount / DURATION => works fine (small rate)
    // Mutant: _amount - DURATION => underflows (since 100e18 - 604800 < 0) causing revert
    const smallAmount = ethers.parseEther("100");
    await expect(
      instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), smallAmount)
    ).to.be.reverted;

    // Verify that notifyRewardAmount with amount > DURATION still works (mutant would compute wrong rate)
    const largeAmount = ethers.parseEther("1000000");
    await expect(
      instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), largeAmount)
    ).to.not.be.reverted;
  });
});