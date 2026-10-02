import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory mutant test", function () {
  it("should revert when non-jojoTeam calls newEmergencyOracle", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy EmergencyOracleFactory - note: it has no constructor arguments
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Set jojoTeam to owner for testing purposes
    await factory.connect(owner).setJojoTeam(owner.address);
    
    // Attempt to call newEmergencyOracle from addr1 (not jojoTeam)
    await expect(
      factory.connect(addr1).newEmergencyOracle("Test Oracle")
    ).to.be.revertedWith("Caller is not the JOJO team");
  });
});