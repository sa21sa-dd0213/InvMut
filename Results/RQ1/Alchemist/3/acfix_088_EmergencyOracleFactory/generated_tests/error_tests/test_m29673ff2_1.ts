import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory - Mutant Detection Test", function () {
  it("should revert when non-jojoTeam address calls newEmergencyOracle", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy EmergencyOracleFactory
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Set the jojoTeam address to owner
    await factory.connect(owner).setJojoTeam(owner.address);
    
    // Attempt to call newEmergencyOracle from addr1 (not jojoTeam)
    // The original contract should revert with "Caller is not the JOJO team"
    // The mutant (without onlyJojoTeam modifier) would allow this call to succeed
    await expect(
      factory.connect(addr1).newEmergencyOracle("Test Description")
    ).to.be.revertedWith("Caller is not the JOJO team");
  });
});