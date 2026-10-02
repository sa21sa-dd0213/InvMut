import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory mutant m12ee04a5", function () {
  it("should emit NewEmergencyOracle event when creating a new oracle", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy EmergencyOracleFactory
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Set jojoTeam to owner via storage slot manipulation
    // jojoTeam is the first state variable (slot 0)
    await ethers.provider.send("hardhat_setStorageAt", [
      await factory.getAddress(),
      "0x0",
      ethers.zeroPadValue(owner.address, 32)
    ]);

    // Now owner can call newEmergencyOracle since jojoTeam == owner
    const description = "Test Oracle";
    const tx = await factory.connect(owner).newEmergencyOracle(description);
    const receipt = await tx.wait();

    // Check that NewEmergencyOracle event was emitted
    const event = receipt!.logs.find(
      (log: any) => log.topics[0] === ethers.id("NewEmergencyOracle(address,address)")
    );
    expect(event).to.not.be.undefined;
  });
});