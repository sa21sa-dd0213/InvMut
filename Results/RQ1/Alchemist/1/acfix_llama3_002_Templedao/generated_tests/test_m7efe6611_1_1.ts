import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m7efe6611 test", function () {
  it("should revert when notifying reward for unregistered token on original, but succeed on mutant", async function () {
    const [owner, distributor] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK");
    await stakingToken.waitForDeployment();

    // Deploy a mock reward token that is NOT added to rewardTokens
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD");
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), distributor.address);
    await instance.waitForDeployment();

    // Set reward distributor
    await instance.connect(owner).setRewardDistributor(distributor.address);

    // Fund distributor with reward tokens
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.connect(distributor).approve(await instance.getAddress(), rewardAmount);

    // Attempt to notify reward for an unregistered token
    // This should revert on original (require check exists) but succeed on mutant (check removed)
    await expect(
      instance.connect(distributor).notifyRewardAmount(await rewardToken.getAddress(), rewardAmount)
    ).to.be.revertedWith("unknown reward token");
  });
});