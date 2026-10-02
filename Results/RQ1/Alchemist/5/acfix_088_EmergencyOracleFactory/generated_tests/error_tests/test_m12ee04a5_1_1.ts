import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory - Kill mutant m12ee04a5", function () {
  it("should emit NewEmergencyOracle event when newEmergencyOracle is called", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy EmergencyOracleFactory with owner as jojoTeam
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Set the jojoTeam address to owner
    await factory.connect(owner).setJojoTeam(owner.address);

    // Call newEmergencyOracle and expect the event to be emitted
    const description = "Test Oracle";
    await expect(factory.connect(owner).newEmergencyOracle(description))
      .to.emit(factory, "NewEmergencyOracle")
      .withArgs(owner.address, await factory.getAddress());
  });
});