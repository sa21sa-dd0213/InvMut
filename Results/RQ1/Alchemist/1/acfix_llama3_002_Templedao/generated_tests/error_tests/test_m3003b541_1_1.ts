import { expect } from "chai";
import { ethers } from "hardhat";

describe("StaxLPStaking - mutant m3003b541", function () {
  it("should emit UpdatedRewardDistributor event when setRewardDistributor is called", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock ERC20 token for stakingToken constructor argument
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const stakingToken = await MockERC20.deploy("Staking Token", "STK");
    await stakingToken.waitForDeployment();

    // Deploy StaxLPStaking with required constructor arguments
    const Factory = await ethers.getContractFactory("StaxLPStaking");
    const instance = await Factory.deploy(
      await stakingToken.getAddress(),
      owner.address
    );
    await instance.waitForDeployment();

    // Get the current reward distributor (should be owner initially)
    const currentDistributor = await instance.rewardDistributor();
    expect(currentDistributor).to.equal(owner.address);

    // Set a new reward distributor
    const newDistributor = addr1.address;

    // Expect the UpdatedRewardDistributor event to be emitted with the new distributor address
    await expect(instance.connect(owner).setRewardDistributor(newDistributor))
      .to.emit(instance, "UpdatedRewardDistributor")
      .withArgs(newDistributor);

    // Verify the state change as well
    const updatedDistributor = await instance.rewardDistributor();
    expect(updatedDistributor).to.equal(newDistributor);
  });
});