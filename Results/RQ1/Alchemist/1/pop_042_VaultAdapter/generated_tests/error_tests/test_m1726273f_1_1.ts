import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m1726273f - reinitialization test", function () {
  it("should revert when initialize is called a second time (detects missing initializer modifier)", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy VaultAdapter (constructor has no arguments, only _disableInitializers())
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a mock AccessControl contract for the initialize function
    const AccessControlFactory = await ethers.getContractFactory("AccessControlMock");
    const accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();

    // First call to initialize should succeed
    await instance.initialize(await accessControl.getAddress());

    // Second call to initialize should revert with InvalidInitialization error
    // In the original contract, the initializer modifier prevents re-initialization
    // In the mutant, the modifier is removed, so the second call would succeed (killing the mutant)
    await expect(
      instance.initialize(await accessControl.getAddress())
    ).to.be.revertedWithCustomError(instance, "InvalidInitialization");
  });
});