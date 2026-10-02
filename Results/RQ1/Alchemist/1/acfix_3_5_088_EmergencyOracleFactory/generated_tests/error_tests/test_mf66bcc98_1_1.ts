import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory mutant kill test - mf66bcc98", function () {
  it("should revert when non-admin calls newEmergencyOracle", async function () {
    const [owner, nonAdmin] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Verify nonAdmin is not an admin
    expect(await instance.isAdmin(nonAdmin.address)).to.equal(false);
    
    // Non-admin should NOT be able to call newEmergencyOracle
    await expect(
      instance.connect(nonAdmin).newEmergencyOracle("test description")
    ).to.be.revertedWith("Only admin can call address(this) function");
  });
});