import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory - Kill mutant mf66bcc98", function () {
  it("should revert when non-admin calls newEmergencyOracle", async function () {
    const [owner, nonAdmin] = await ethers.getSigners();
    
    // Deploy EmergencyOracleFactory (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Verify nonAdmin is not an admin
    expect(await factory.isAdmin(nonAdmin.address)).to.equal(false);
    
    // Attempt to call newEmergencyOracle from non-admin address
    // In the original contract this should revert; the mutant would allow it
    await expect(
      factory.connect(nonAdmin).newEmergencyOracle("Test Oracle")
    ).to.be.revertedWith("Only admin can call address(this) function");
  });
});