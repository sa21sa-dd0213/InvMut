import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory mutant detection", function () {
  it("should revert when non-admin calls newEmergencyOracle", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy EmergencyOracleFactory (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Attempt to call newEmergencyOracle from a non-admin address
    // This should revert in the original contract due to onlyAdmin modifier
    await expect(
      factory.connect(addr1).newEmergencyOracle("test description")
    ).to.be.revertedWith("Only admin can call address(this) function");
  });
});