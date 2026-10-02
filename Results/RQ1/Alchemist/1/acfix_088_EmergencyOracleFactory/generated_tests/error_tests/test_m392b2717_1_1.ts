import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory mutant kill test - m392b2717", function () {
  it("should revert when JOJO team calls newEmergencyOracle if modifier is inverted", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy EmergencyOracleFactory with owner as the JOJO team
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Set the JOJO team address to owner
    await factory.connect(owner).setJojoTeam(owner.address);

    // Attempt to call newEmergencyOracle from the JOJO team address (owner)
    // In the original: this should succeed
    // In the mutant: this should revert because msg.sender != jojoTeam is false
    await expect(
      factory.connect(owner).newEmergencyOracle("Test Oracle")
    ).to.be.revertedWith("Caller is not the JOJO team");
  });
});