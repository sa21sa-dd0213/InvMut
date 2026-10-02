import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking mutant test for addReward", function () {
  it("should successfully add a new reward token (kills mutant that inverts existence check)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK", ethers.parseEther("1000000"));
    await stakingToken.waitForDeployment();

    // Deploy a mock ERC20 token for rewards
    const rewardToken = await MockERC20.deploy("Reward Token", "RWD", ethers.parseEther("1000000"));
    await rewardToken.waitForDeployment();

    // Deploy the StaxLPStaking contract
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(await stakingToken.getAddress(), owner.address);
    await instance.waitForDeployment();

    // Initially, the reward token has NOT been added yet
    // In the original contract, lastUpdateTime == 0 means it can be added
    // The mutant requires lastUpdateTime != 0, which would cause revert for new tokens

    // This call should succeed on the original contract
    // On the mutant, it will revert because lastUpdateTime is 0 (not != 0)
    await expect(
      instance.connect(owner).addReward(await rewardToken.getAddress())
    ).to.not.be.reverted;

    // Verify the reward token was actually added
    const rewardData = await instance.rewardData(await rewardToken.getAddress());
    expect(rewardData.lastUpdateTime).to.not.equal(0);
  });
});