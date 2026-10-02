import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory mutant kill test", function () {
  it("should revert when called from non-jojoTeam address in original, but mutant allows it - kill mutant by calling from jojoTeam address and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy EmergencyOracleFactory - it has no constructor arguments
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Set jojoTeam to owner
    await factory.connect(owner).setJojoTeam(owner.address);

    // The mutant changes == to != in onlyJojoTeam modifier
    // Original: only jojoTeam can call newEmergencyOracle
    // Mutant: only NON-jojoTeam can call newEmergencyOracle

    // To kill the mutant, call from jojoTeam address and expect success
    // Under original: succeeds (jojoTeam == jojoTeam)
    // Under mutant: fails (jojoTeam != jojoTeam is false) - so the test will fail on mutant
    await expect(
      factory.connect(owner).newEmergencyOracle("test description")
    ).to.not.be.reverted;
  });
});