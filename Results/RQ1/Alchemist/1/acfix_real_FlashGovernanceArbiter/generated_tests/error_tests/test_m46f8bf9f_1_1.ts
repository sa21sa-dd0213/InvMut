import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant m46f8bf9f - enforceTolerance", function () {
  it("should revert when enforceTolerance is called with violating values from an active and configured caller", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy FlashGovernanceArbiter with a DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(addr1.address);
    await instance.waitForDeployment();

    // Set up the DAO to be configured and have successful proposals
    await instance.connect(addr1).setDAO(addr1.address);

    // Deploy a mock Configurable contract to test enforceTolerance
    const ConfigurableMock = await ethers.getContractFactory(
      "contracts/mocks/ConfigurableMock.sol:ConfigurableMock"
    );
    const configurableMock = await ConfigurableMock.deploy();
    await configurableMock.waitForDeployment();

    // Enable enforcement for the configurableMock address
    await instance.connect(configurableMock.address).setEnforcement(true);

    // Re-deploy with owner as DAO for easier testing
    const instance2 = await Factory.deploy(owner.address);
    await instance2.waitForDeployment();

    // Configure security parameters
    await instance2.connect(owner).configureSecurityParameters(
      10, // maxGovernanceChangePerEpoch
      100, // epochSize
      10  // changeTolerance (10%)
    );

    // Enable enforcement for the caller
    await instance2.connect(owner).setEnforcement(true);

    // Now test enforceTolerance with values that should violate
    await expect(
      instance2.connect(owner).enforceTolerance(100, 50)
    ).to.be.revertedWith("FE1");
  });
});