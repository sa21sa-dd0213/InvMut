import { expect } from "chai";
import { ethers } } from "hardhat";

describe("EmergencyOracleFactory mutant mf66bcc98 - onlyAdmin modifier test", function () {
  it("should revert when non-admin calls newEmergencyOracle", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy EmergencyOracleFactory (no constructor arguments)
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Ensure addr1 is NOT an admin
    const isAdminAddr1 = await factory.isAdmin(addr1.address);
    expect(isAdminAddr1).to.equal(false);
    
    // Attempt to call newEmergencyOracle from non-admin address
    // This should revert on the original contract, but succeed on the mutant
    await expect(
      factory.connect(addr1).newEmergencyOracle("Test Description")
    ).to.be.revertedWith("Only admin can call address(this) function");
  });
});