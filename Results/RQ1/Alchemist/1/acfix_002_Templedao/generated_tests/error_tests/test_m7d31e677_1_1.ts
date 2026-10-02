import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m7d31e677 test", function () {
  it("should kill mutant by claiming rewards after staking and notifying rewards", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20Factory.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockERC20Factory.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    const instanceAddress = await instance.getAddress();

    // Add reward token
    await instance.addReward(await rewardToken.getAddress());

    // Transfer staking tokens to addr1 and approve contract
    await stakingToken.transfer(addr1.address, ethers.parseEther("1000"));
    await stakingToken.connect(addr1).approve(instanceAddress, ethers.parseEther("1000"));

    // addr1 stakes 100 tokens
    await instance.connect(addr1).stake(ethers.parseEther("100"));

    // Owner transfers reward tokens to contract and notifies reward
    await rewardToken.transfer(instanceAddress, ethers.parseEther("1000"));
    await rewardToken.approve(instanceAddress, ethers.parseEther("1000"));
    await instance.notifyRewardAmount(await rewardToken.getAddress(), ethers.parseEther("1000"));

    // Fast forward time to accumulate rewards (past DURATION = 7 days)
    await ethers.provider.send("evm_increaseTime", [86400 * 8]); // 8 days
    await ethers.provider.send("evm_mine", []);

    // Get addr1's reward token balance before claiming
    const balanceBefore = await rewardToken.balanceOf(addr1.address);

    // addr1 claims rewards
    await instance.connect(addr1).getRewards(addr1.address);

    // Get addr1's reward token balance after claiming
    const balanceAfter = await rewardToken.balanceOf(addr1.address);

    // In the original contract, rewards should be transferred (balanceAfter > balanceBefore)
    // In the mutant, amount < 0 is always false, so no transfer occurs (balanceAfter == balanceBefore)
    // This assertion will fail on the mutant, killing it
    expect(balanceAfter).to.be.gt(balanceBefore);
  });
});