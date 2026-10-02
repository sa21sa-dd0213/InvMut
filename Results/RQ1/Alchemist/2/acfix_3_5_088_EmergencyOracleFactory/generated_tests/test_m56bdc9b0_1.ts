import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory - Kill mutant m56bdc9b0", function () {
  it("should emit NewEmergencyOracle event when newEmergencyOracle is called by admin", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy EmergencyOracleFactory
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Set owner as admin
    await factory.setAdmin(owner.address, true);
    
    // Verify owner is admin
    expect(await factory.isAdmin(owner.address)).to.equal(true);
    
    // Call newEmergencyOracle and check for event emission
    const description = "Test Oracle";
    await expect(factory.newEmergencyOracle(description))
      .to.emit(factory, "NewEmergencyOracle")
      .withArgs(owner.address, ethers.any); // newOracle address is unpredictable
  });
});