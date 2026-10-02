import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory mutant test", function () {
  it("should revert when non-jojoTeam address calls newEmergencyOracle", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy EmergencyOracleFactory
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Set jojoTeam to owner
    await factory.setJojoTeam(owner.address);
    
    // Attempt to call newEmergencyOracle from addr1 (not jojoTeam)
    await expect(
      factory.connect(addr1).newEmergencyOracle("Test Description")
    ).to.be.revertedWith("Caller is not the JOJO team");
  });
});