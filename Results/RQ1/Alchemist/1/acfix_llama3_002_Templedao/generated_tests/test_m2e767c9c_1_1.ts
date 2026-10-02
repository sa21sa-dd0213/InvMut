import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant m2e767c9c", function () {
  it("should revert when calling notifyRewardAmount from the intended distributor after setRewardDistributor is called with a specific address", async function () {
    const [owner, distributor, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockToken = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockToken.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy another token for rewards
    const rewardToken = await MockToken.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking with staking token and initial distributor (owner)
    const StaxLPStaking = await ethers.getContractFactory("StaxLPStaking");
    const instance = await StaxLPStaking.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Set reward distributor to the specific distributor address
    await instance.connect(owner).setRewardDistributor(distributor.address);

    // Add reward token
    await instance.connect(owner).addReward(await rewardToken.getAddress());

    // Transfer reward tokens to distributor
    await rewardToken.connect(owner).transfer(distributor.address, ethers.parseEther("1000"));
    await rewardToken.connect(distributor).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Try to call notifyRewardAmount from the intended distributor
    // In the original contract this should succeed, in the mutant it should revert
    // because the mutant sets rewardDistributor = address(this) instead of _distributor
    await expect(
      instance.connect(distributor).notifyRewardAmount(
        await rewardToken.getAddress(),
        ethers.parseEther("100")
      )
    ).to.be.revertedWith("not distributor");
  });
});