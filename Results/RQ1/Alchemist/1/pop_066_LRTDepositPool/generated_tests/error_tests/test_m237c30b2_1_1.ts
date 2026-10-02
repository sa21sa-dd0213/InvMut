import { expect } from "chai";
import { ethers } from "hardhat";

describe("LRTDepositPool - mutant m237c30b2 (remove initializer modifier)", function () {
  it("should revert when initialize is called a second time, but mutant allows it", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy LRTDepositPool - no constructor arguments needed (constructor only calls _disableInitializers())
    const Factory = await ethers.getContractFactory("LRTDepositPool");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // We need a valid LRTConfig address to call initialize
    // Deploy a minimal mock for LRTConfig that has the required interface
    const LRTConfigFactory = await ethers.getContractFactory("LRTConfig");
    const lrtConfig = await LRTConfigFactory.deploy();
    await lrtConfig.waitForDeployment();

    // First initialize call - should succeed in both original and mutant
    await instance.initialize(await lrtConfig.getAddress());

    // Second initialize call - should revert in original (due to initializer modifier)
    // but should succeed in mutant (because initializer modifier is removed)
    await expect(
      instance.initialize(await lrtConfig.getAddress())
    ).to.be.reverted;
  });
});