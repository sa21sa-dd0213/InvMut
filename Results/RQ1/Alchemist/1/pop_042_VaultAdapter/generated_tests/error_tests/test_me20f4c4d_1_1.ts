import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant kill test - me20f4c4d", function () {
  it("should revert when setting slopes with kink > 1e27 (mutant allows it)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("VaultAdapter");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First initialize the contract
    const accessControlFactory = await ethers.getContractFactory("AccessControl");
    const accessControl = await accessControlFactory.deploy();
    await accessControl.waitForDeployment();

    await instance.initialize(await accessControl.getAddress());

    // Grant access to owner for setSlopes function
    const setSlopesSelector = instance.interface.getFunction("setSlopes").selector;
    await accessControl.grantAccess(setSlopesSelector, await instance.getAddress(), owner.address);

    // Try to set slopes with kink value greater than 1e27 (e.g., 1e27 + 1)
    // Original contract would revert with InvalidKink(), mutant would not
    const ONE_E27 = ethers.parseEther("1000000000000000000000000000"); // 1e27
    const invalidKink = ONE_E27 + 1n; // 1e27 + 1

    const slopeData = {
      kink: invalidKink,
      slope0: ethers.parseEther("1"),
      slope1: ethers.parseEther("1")
    };

    await expect(
      instance.connect(owner).setSlopes(owner.address, slopeData)
    ).to.be.revertedWithCustomError(instance, "InvalidKink");
  });
});