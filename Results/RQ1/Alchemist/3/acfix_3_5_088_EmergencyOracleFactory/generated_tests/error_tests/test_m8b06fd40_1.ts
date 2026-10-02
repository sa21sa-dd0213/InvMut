import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory mutant test - onlyAdmin modifier removal", function () {
  it("should revert when non-admin calls newEmergencyOracle", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // addr1 is not an admin, so calling newEmergencyOracle should revert
    await expect(
      instance.connect(addr1).newEmergencyOracle("test description")
    ).to.be.revertedWith("Only admin can call address(this) function");
  });
});