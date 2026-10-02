import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory - kill mutant m392b2717 (onlyJojoTeam modifier)", function () {
  it("should revert when jojoTeam calls newEmergencyOracle in the mutant, but pass in the original", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy EmergencyOracleFactory - note: constructor takes no arguments
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Initially, jojoTeam is address(0) (default). Set it to owner
    // Since there's no setter for jojoTeam in the contract, we need to use storage manipulation
    // OR we can directly test the modifier behavior by setting jojoTeam via storage slot
    // However, looking at the contract, jojoTeam is not initialized in constructor
    // So it defaults to address(0). We'll set it via storage for testing
    
    // Actually, we can test the mutant behavior more directly:
    // In the original: require(msg.sender == jojoTeam) - only jojoTeam can call
    // In the mutant: require(msg.sender != jojoTeam) - only NON-jojoTeam can call

    // To properly test, let's set jojoTeam to owner via storage slot manipulation
    // Slot 0 for jojoTeam variable
    await ethers.provider.send("hardhat_setStorageAt", [
      await factory.getAddress(),
      "0x0",
      ethers.zeroPadValue(owner.address, 32)
    ]);

    // Now test: owner is jojoTeam
    // In original: should succeed
    // In mutant: should revert (because owner == jojoTeam triggers the != condition to fail)

    // The description parameter for newEmergencyOracle
    const description = "Test Oracle";

    // Call newEmergencyOracle from owner (who is jojoTeam)
    // In the original contract this should succeed
    // In the mutant this should revert because owner == jojoTeam and mutant uses !=
    
    await expect(
      factory.connect(owner).newEmergencyOracle(description)
    ).to.not.be.reverted;

    // The above test will PASS on the original (because it doesn't revert)
    // But FAIL on the mutant (because it reverts unexpectedly)
    // This KILLS the mutant
  });
});