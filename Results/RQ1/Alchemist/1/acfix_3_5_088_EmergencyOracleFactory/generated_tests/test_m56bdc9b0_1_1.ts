import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory mutant test - event emission", function () {
  it("should emit NewEmergencyOracle event when creating a new oracle", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy EmergencyOracleFactory
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Set owner as admin
    await factory.connect(owner).isAdmin(owner.address, true);
    
    // Expect event emission when calling newEmergencyOracle
    const description = "Test Oracle";
    await expect(factory.connect(owner).newEmergencyOracle(description))
      .to.emit(factory, "NewEmergencyOracle")
      .withArgs(owner.address, ethers.anyValue); // Use ethers.anyValue instead of anyAddress
  });
});