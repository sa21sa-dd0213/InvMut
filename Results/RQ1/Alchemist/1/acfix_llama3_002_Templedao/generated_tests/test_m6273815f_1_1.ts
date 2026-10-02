import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - kill mutant m6273815f (duplicate reward token check)", function () {
  it("should revert when adding an already existing reward token, but mutant allows it", async function () {
    const [owner, distributor] = await ethers.getSigners();

    // Deploy a mock ERC20 token for staking
    const MockTokenFactory = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockTokenFactory.deploy("Staking Token", "STK");
    await stakingToken.waitForDeployment();

    // Deploy a mock reward token
    const rewardToken = await MockTokenFactory.deploy("Reward Token", "RWD");
    await rewardToken.waitForDeployment();

    // Deploy StaxLPStaking with constructor arguments
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(
      await stakingToken.getAddress(),
      await distributor.getAddress()
    );
    await instance.waitForDeployment();

    // First call to addReward should succeed
    await instance.connect(owner).addReward(await rewardToken.getAddress());

    // Second call to addReward with the same token should revert in original contract
    // The mutant removes the require check, so it would not revert
    await expect(
      instance.connect(owner).addReward(await rewardToken.getAddress())
    ).to.be.revertedWith("exists");
  });
});