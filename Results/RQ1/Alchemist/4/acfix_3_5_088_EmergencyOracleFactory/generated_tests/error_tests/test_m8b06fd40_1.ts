import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory mutant m8b06fd40 test", function () {
  it("should revert when non-admin calls newEmergencyOracle", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy EmergencyOracleFactory
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // addr1 is not an admin, so calling newEmergencyOracle should revert
    // The original contract has onlyAdmin modifier which checks isAdmin[msg.sender]
    // The mutant removes this modifier, so the call would succeed instead of reverting
    await expect(
      factory.connect(addr1).newEmergencyOracle("Test Oracle")
    ).to.be.revertedWith("Only admin can call address(this) function");
  });
});