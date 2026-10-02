import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - m9497e076", function () {
  it("should kill mutant by calling notifyRewardAmount after period has ended", async function () {
    const [owner, distributor, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 for staking token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();
    
    // Deploy a mock ERC20 for reward token
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();
    
    // Deploy the StaxLPStaking contract
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const instance = await StaxLPStaking.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();
    
    // Add reward token and set reward distributor
    await instance.connect(owner).addReward(await rewardToken.getAddress());
    await instance.connect(owner).setRewardDistributor(distributor.address);
    
    // Fund distributor with reward tokens
    await rewardToken.connect(owner).transfer(distributor.address, ethers.parseEther("10000"));
    await rewardToken.connect(distributor).approve(await instance.getAddress(), ethers.parseEther("10000"));
    
    // First notify reward to start a reward period
    await instance.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      ethers.parseEther("1000")
    );
    
    // Get the period finish time
    const periodFinish = await instance.rewardPeriodFinish(await rewardToken.getAddress());
    
    // Fast forward time past the period finish
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(periodFinish) + 100]);
    await ethers.provider.send("evm_mine");
    
    // Now call notifyRewardAmount again - should fail on mutant but pass on original
    // On original: block.timestamp >= periodFinish is true, so reward rate is recalculated
    // On mutant: block.timestamp == periodFinish is false (since we're past it), so wrong branch is taken
    await expect(
      instance.connect(distributor).notifyRewardAmount(
        await rewardToken.getAddress(),
        ethers.parseEther("500")
      )
    ).to.not.be.reverted;
    
    // Verify that the reward rate was properly updated (mutant would have incorrect rate)
    const rewardData = await instance.rewardData(await rewardToken.getAddress());
    const expectedRate = ethers.parseEther("500") / BigInt(86400 * 7);
    
    // On original, rate should be approximately 500/DURATION
    // On mutant, rate would be miscalculated due to entering wrong branch
    expect(rewardData.rewardRate).to.be.closeTo(expectedRate, ethers.parseEther("0.001"));
  });
});