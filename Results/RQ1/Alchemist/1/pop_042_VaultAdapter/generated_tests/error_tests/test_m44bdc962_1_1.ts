import { expect } from "chai";
import { ethers } from "hardhat";

describe("VaultAdapter mutant m44bdc962 test", function () {
  it("should revert when unauthorized address calls upgradeToAndCall on original, but mutant allows it", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy VaultAdapter - constructor has no arguments
    const VaultAdapterFactory = await ethers.getContractFactory("VaultAdapter");
    const vaultAdapter = await VaultAdapterFactory.deploy();
    await vaultAdapter.waitForDeployment();

    // Deploy a mock implementation for upgrade
    const MockImplementation = await ethers.getContractFactory("VaultAdapter");
    const newImplementation = await MockImplementation.deploy();
    await newImplementation.waitForDeployment();

    // Get the access control address from the VaultAdapter storage
    // Since we need to initialize first to set up access control
    // We'll deploy a mock access control contract
    // Deploy a simple access control that will deny all access
    const MockAccessControl = await ethers.getContractFactory("MockAccessControl");
    const accessControl = await MockAccessControl.deploy();
    await accessControl.waitForDeployment();

    // Initialize VaultAdapter with access control
    await vaultAdapter.connect(owner).initialize(await accessControl.getAddress());

    // Attempt to upgrade from unauthorized address (attacker)
    // The original contract should revert due to checkAccess(bytes4(0)) modifier
    // The mutant removes this check, so it would succeed
    const upgradeData = "0x";

    // On the original contract this should revert
    // On the mutant this would not revert (killing the mutant)
    await expect(
      vaultAdapter.connect(attacker).upgradeToAndCall(
        await newImplementation.getAddress(),
        upgradeData,
        { value: 0 }
      )
    ).to.be.reverted;
  });
});