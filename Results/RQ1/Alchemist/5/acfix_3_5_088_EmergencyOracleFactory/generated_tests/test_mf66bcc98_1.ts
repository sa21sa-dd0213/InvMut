import { expect } from "chai";
import { ethers } } from "hardhat";

describe("EmergencyOracleFactory mutant mf66bcc98 test", function () {
  it("should revert when non-admin calls newEmergencyOracle (kills mutant that removes require)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy EmergencyOracleFactory
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Ensure addr1 is NOT an admin
    // (by default, no one is admin since constructor doesn't set any)
    
    // Attempt to call newEmergencyOracle from non-admin addr1 - should revert
    await expect(
      instance.connect(addr1).newEmergencyOracle("test description")
    ).to.be.revertedWith("Only admin can call address(this) function");
  });
});