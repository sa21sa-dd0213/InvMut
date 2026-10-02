import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory mutant detection - event emission", function () {
  it("should emit NewEmergencyOracle event when newEmergencyOracle is called", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy EmergencyOracleFactory - no constructor arguments needed
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Set owner as admin first (since onlyAdmin modifier requires isAdmin mapping)
    await factory.connect(owner).setAdmin(owner.address, true);

    // Call newEmergencyOracle and check for event emission
    const description = "Test Oracle";
    const tx = await factory.connect(owner).newEmergencyOracle(description);
    const receipt = await tx.wait();

    // Check that the NewEmergencyOracle event was emitted
    await expect(tx)
      .to.emit(factory, "NewEmergencyOracle")
      .withArgs(owner.address, ethers.anyValue); // The new oracle address is unknown but event should fire
  });
});