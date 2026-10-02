import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory mutant mdc02fe09", function () {
  it("should revert when non-jojoTeam address calls newEmergencyOracle", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy EmergencyOracleFactory with owner as jojoTeam
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set the jojoTeam address to owner
    await instance.connect(owner).setJojoTeam(owner.address);

    // Attempt to call newEmergencyOracle from addr1 (not jojoTeam) - should revert
    await expect(
      instance.connect(addr1).newEmergencyOracle("Test Oracle")
    ).to.be.revertedWith("Caller is not the JOJO team");
  });
});