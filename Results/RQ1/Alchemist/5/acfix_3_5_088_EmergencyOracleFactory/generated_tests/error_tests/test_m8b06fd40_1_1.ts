import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory - Mutant m8b06fd40 test", function () {
  it("should revert when non-admin calls newEmergencyOracle (onlyAdmin modifier)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy EmergencyOracleFactory - no constructor arguments needed
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Try to call newEmergencyOracle from a non-admin address
    // In the original contract this should revert with "Only admin can call address(this) function"
    // In the mutant (missing onlyAdmin modifier) it will succeed instead of reverting
    await expect(
      factory.connect(addr1).newEmergencyOracle("Test description")
    ).to.be.revertedWith("Only admin can call address(this) function");
  });
});