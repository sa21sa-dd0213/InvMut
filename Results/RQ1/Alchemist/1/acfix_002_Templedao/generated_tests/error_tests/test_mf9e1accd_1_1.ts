import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant kill test - getRewards modifier removal", function () {
  it("should kill mutant mf9e1accd by demonstrating that getRewards fails to update claimable rewards when updateReward modifier is removed", async function () {
    const [owner, staker, distributor] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking and rewards
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await ERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    const rewardToken = await ERC20Factory.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const StakingFactory = await ethers.getContractFactory("StaxLPStaking");
    const staking = await StakingFactory.deploy(await stakingToken.getAddress(), distributor.address);
    await staking.waitForDeployment();

    // Set reward distributor
    await staking.connect(owner).setRewardDistributor(distributor.address);

    // Add reward token
    await staking.connect(owner).addReward(await rewardToken.getAddress());

    // Transfer staking tokens to staker
    await stakingToken.transfer(staker.address, ethers.parseEther("100"));
    await stakingToken.connect(staker).approve(await staking.getAddress(), ethers.parseEther("100"));

    // Transfer reward tokens to distributor
    await rewardToken.transfer(distributor.address, ethers.parseEther("10000"));
    await rewardToken.connect(distributor).approve(await staking.getAddress(), ethers.parseEther("10000"));

    // Staker stakes tokens
    await staking.connect(staker).stake(ethers.parseEther("10"));

    // Distributor notifies reward (1000 tokens over 1 week)
    await staking.connect(distributor).notifyRewardAmount(
      await rewardToken.getAddress(),
      ethers.parseEther("1000")
    );

    // Fast forward time to accrue rewards (advance 3 days)
    await ethers.provider.send("evm_increaseTime", [3 * 86400]);
    await ethers.provider.send("evm_mine");

    // Check earned rewards before claiming - this should show accumulated rewards
    const earnedBefore = await staking.earned(staker.address, await rewardToken.getAddress());
    expect(earnedBefore).to.be.gt(0);

    // Claim rewards using getRewards - this is where the mutant fails
    // In the original, the updateReward modifier recalculates claimableRewards
    // In the mutant, claimableRewards is not updated, so staker gets nothing
    const tx = await staking.connect(staker).getRewards(staker.address);
    await tx.wait();

    // Check if rewards were actually claimed
    // In the original: claimableRewards was updated by the modifier, then _getRewards transfers them
    // In the mutant: claimableRewards was NOT updated, so _getRewards finds 0 to transfer
    const rewardBalance = await rewardToken.balanceOf(staker.address);

    // The mutant will fail this assertion because rewards were not properly claimed
    expect(rewardBalance).to.equal(earnedBefore);

    // Additional verification: claimable rewards should be 0 after claiming
    const claimableAfter = await staking.claimableRewards(staker.address, await rewardToken.getAddress());
    expect(claimableAfter).to.equal(0);
  });
});