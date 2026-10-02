import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory mutant mdc02fe09 test", function () {
  it("should revert when non-JOJO team calls newEmergencyOracle", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy EmergencyOracleFactory
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Set the JOJO team to owner
    await factory.connect(owner).setJojoTeam(owner.address);
    
    // Attempt to call newEmergencyOracle from addr1 (non-JOJO team)
    await expect(
      factory.connect(addr1).newEmergencyOracle("Test Oracle")
    ).to.be.revertedWith("Caller is not the JOJO team");
  });
});