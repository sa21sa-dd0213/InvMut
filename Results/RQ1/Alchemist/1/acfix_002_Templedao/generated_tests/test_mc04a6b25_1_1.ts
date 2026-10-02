import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant mc04a6b25 test", function () {
  it("should kill mutant by verifying rewardDistributor is set correctly after calling setRewardDistributor", async function () {
    const [owner, addr1, distributor] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Add a reward token so we can test notifyRewardAmount
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    await instance.addReward(await rewardToken.getAddress());

    // Transfer some reward tokens to the new distributor
    await rewardToken.transfer(distributor.address, ethers.parseEther("1000"));

    // Call setRewardDistributor with a non-zero address
    await instance.connect(owner).setRewardDistributor(distributor.address);

    // Approve the contract to spend reward tokens from the distributor
    await rewardToken.connect(distributor).approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Attempt to call notifyRewardAmount from the new distributor
    // In the original contract this should succeed
    // In the mutant, rewardDistributor is always set to address(0), so this should revert
    await expect(
      instance.connect(distributor).notifyRewardAmount(
        await rewardToken.getAddress(),
        ethers.parseEther("100")
      )
    ).to.not.be.reverted;

    // Additional verification: check that rewardDistributor was actually set to the expected address
    const actualDistributor = await instance.rewardDistributor();
    expect(actualDistributor).to.equal(distributor.address);
  });
});