import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory mutant m8b06fd40 test", function () {
  it("should revert when non-admin calls newEmergencyOracle on original contract, but succeed on mutant (missing onlyAdmin modifier)", async function () {
    const [owner, nonAdmin] = await ethers.getSigners();
    
    // Deploy EmergencyOracleFactory (no constructor arguments)
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Initially, no one is admin, so even owner is not admin
    // Attempt to call newEmergencyOracle from a non-admin address
    await expect(
      factory.connect(nonAdmin).newEmergencyOracle("Test Oracle")
    ).to.be.revertedWith("Only admin can call address(this) function");
  });
});