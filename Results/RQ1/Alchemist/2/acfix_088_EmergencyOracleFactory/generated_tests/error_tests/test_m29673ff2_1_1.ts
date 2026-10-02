import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory mutant m29673ff2 - access control removal", function () {
  it("should revert when non-jojoTeam calls newEmergencyOracle on original but not on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy EmergencyOracleFactory
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set jojoTeam to owner
    await instance.setJojoTeam(owner.address);

    // Attempt to call newEmergencyOracle from addr1 (non-jojoTeam)
    // The original contract would revert due to onlyJojoTeam modifier
    // The mutant would allow this call to succeed
    await expect(
      instance.connect(addr1).newEmergencyOracle("Test Description")
    ).to.be.revertedWith("Caller is not the JOJO team");
  });
});