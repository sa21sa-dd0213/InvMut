import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant m7efe6611 test", function () {
  it("should revert when notifying reward for unregistered token", async function () {
    const [owner, distributor] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const StakingTokenFactory = await ethers.getContractFactory("ERC20Mock");
    const stakingToken = await StakingTokenFactory.deploy("Staking", "STK", 18);
    await stakingToken.waitForDeployment();

    // Deploy another token as the unregistered reward token
    const RewardTokenFactory = await ethers.getContractFactory("ERC20Mock");
    const rewardToken = await RewardTokenFactory.deploy("Reward", "RWD", 18);
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking with staking token and distributor address
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(
      await stakingToken.getAddress(),
      await distributor.getAddress()
    );
    await instance.waitForDeployment();

    // Fund distributor with reward tokens and approve
    const rewardAmount = ethers.parseEther("1000");
    await rewardToken.mint(await distributor.getAddress(), rewardAmount);
    await rewardToken.connect(distributor).approve(await instance.getAddress(), rewardAmount);

    // Attempt to notify reward for unregistered token - should revert on original
    await expect(
      instance.connect(distributor).notifyRewardAmount(
        await rewardToken.getAddress(),
        rewardAmount
      )
    ).to.be.revertedWith("unknown reward token");
  });
});