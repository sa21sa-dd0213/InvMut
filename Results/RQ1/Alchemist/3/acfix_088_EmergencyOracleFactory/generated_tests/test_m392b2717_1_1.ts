import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory mutant m392b2717", function () {
  it("should kill mutant by calling newEmergencyOracle from the jojoTeam address and expecting success", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy EmergencyOracleFactory - it has no constructor arguments
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Set jojoTeam to owner address
    await factory.setJojoTeam(owner.address);

    // In the original contract, calling from jojoTeam address should succeed
    // In the mutant, calling from jojoTeam address will revert (due to != instead of ==)
    const description = "Test Oracle";

    // This should succeed on original but fail on mutant
    await expect(
      factory.connect(owner).newEmergencyOracle(description)
    ).to.emit(factory, "NewEmergencyOracle").withArgs(owner.address, ethers.ZeroAddress);
  });

  it("should verify that non-jojoTeam addresses cannot call newEmergencyOracle on original", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Set jojoTeam to owner
    await factory.setJojoTeam(owner.address);

    // On original, this should revert; on mutant, this would succeed
    // We test the original behavior
    await expect(
      factory.connect(addr1).newEmergencyOracle("Test")
    ).to.be.revertedWith("Caller is not the JOJO team");
  });
});