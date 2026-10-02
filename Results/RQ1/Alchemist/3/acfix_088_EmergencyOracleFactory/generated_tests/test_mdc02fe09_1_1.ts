import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory mutant test - mdc02fe09", function () {
  it("should revert when calling newEmergencyOracle from non-jojoTeam address", async function () {
    const [owner, addr1] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Set jojoTeam to owner
    await factory.connect(owner).setJojoTeam(owner.address);

    // addr1 is not jojoTeam, should revert on original but pass on mutant
    await expect(
      factory.connect(addr1).newEmergencyOracle("test description")
    ).to.be.revertedWith("Caller is not the JOJO team");
  });
});