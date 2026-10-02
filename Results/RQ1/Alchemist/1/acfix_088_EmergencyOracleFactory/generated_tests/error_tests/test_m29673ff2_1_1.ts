import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory mutant m29673ff2", function () {
  it("should revert when non-jojoTeam address calls newEmergencyOracle", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy EmergencyOracleFactory
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Set jojoTeam to owner by directly setting the state variable
    // We need to set jojoTeam to owner first using the contract's logic
    await factory.setJojoTeam(owner.address);

    // Test with addr1 (non-jojoTeam address)
    await expect(
      factory.connect(addr1).newEmergencyOracle("test oracle")
    ).to.be.revertedWith("Caller is not the JOJO team");
  });
});