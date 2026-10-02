import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m7f850f26 - initializer modifier removal", function () {
  it("should revert on second initialize call, but mutant allows it", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy RoundFactory - it has no constructor arguments (uses OwnableUpgradeable with initializer pattern)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First initialize call should succeed
    await expect(instance.initialize()).to.not.be.reverted;

    // Second initialize call should revert because initializer modifier prevents re-initialization
    // The mutant removes the initializer modifier, so it would not revert
    await expect(instance.initialize()).to.be.reverted;
  });
});