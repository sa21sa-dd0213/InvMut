import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant test - enforceTolerance boundary", function () {
  it("should revert when (v2 - v1) * 100 equals exactly security.changeTolerance * v1 (strict inequality check)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy FlashGovernanceArbiter with a DAO address
    const FlashGovernanceArbiter = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await FlashGovernanceArbiter.deploy(owner.address);
    await instance.waitForDeployment();

    // Deploy a simple contract that implements Configurable
    const ConfigurableMock = await ethers.getContractFactory("ConfigurableMock");
    const configurable = await ConfigurableMock.deploy();
    await configurable.waitForDeployment();

    // Enable enforcement for the configurable contract
    await instance.connect(owner).setEnforcement(true);

    // Now set the security.changeTolerance to 10 through storage manipulation
    // The security struct is at slot 2 (after flashGovernanceConfig at slot 0 and 1)
    // changeTolerance is the last element, packed with maxGovernanceChangePerEpoch at slot 4 (0x04)
    // Set changeTolerance = 10 (0x0a) and maxGovernanceChangePerEpoch = 10 (0x0a)
    // Packed as: 0x0a0a (maxGovernanceChangePerEpoch is first byte, changeTolerance is second byte)
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x4",
      "0x0000000000000000000000000000000000000000000000000000000000000a0a"
    ]);

    // Now test the boundary condition
    // If changeTolerance = 10, then the formula is: (v2 - v1) * 100 < changeTolerance * v1
    // With v1 = 100, v2 = 110: (110 - 100) * 100 = 1000, changeTolerance * v1 = 10 * 100 = 1000
    // Original: 1000 < 1000 => false => revert
    // Mutant: 1000 <= 1000 => true => pass

    // This should revert in the original but pass in the mutant
    await expect(
      instance.connect(configurable).enforceTolerance(100, 110)
    ).to.be.revertedWith("FE1");

    // Also test with v1 > v2 boundary
    // v1 = 110, v2 = 100: (110 - 100) * 100 = 1000, changeTolerance * v2 = 10 * 100 = 1000
    // Original: 1000 < 1000 => false => revert
    await expect(
      instance.connect(configurable).enforceTolerance(110, 100)
    ).to.be.revertedWith("FE1");
  });
});