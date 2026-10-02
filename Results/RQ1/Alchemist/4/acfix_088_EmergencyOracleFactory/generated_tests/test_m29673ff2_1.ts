import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory mutant test - onlyJojoTeam modifier removed", function () {
  it("should revert when non-jojoTeam address calls newEmergencyOracle", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy EmergencyOracleFactory with owner as jojoTeam
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Set jojoTeam to owner
    await instance.connect(owner).setJojoTeam(owner.address);
    
    // Try to call newEmergencyOracle from a non-jojoTeam address (addr1)
    // In original: should revert because addr1 is not jojoTeam
    // In mutant: should succeed because modifier is removed
    await expect(
      instance.connect(addr1).newEmergencyOracle("test description")
    ).to.be.revertedWith("Caller is not the JOJO team");
  });
});