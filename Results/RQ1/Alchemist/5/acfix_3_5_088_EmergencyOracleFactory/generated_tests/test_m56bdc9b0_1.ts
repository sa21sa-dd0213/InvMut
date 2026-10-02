import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory - Kill mutant m56bdc9b0", function () {
  it("should emit NewEmergencyOracle event when newEmergencyOracle is called by admin", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy EmergencyOracleFactory (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Set owner as admin
    await factory.setAdmin(owner.address, true);
    
    // Call newEmergencyOracle and check for event emission
    const description = "Test Oracle";
    const tx = await factory.newEmergencyOracle(description);
    const receipt = await tx.wait();
    
    // Check that NewEmergencyOracle event was emitted with correct parameters
    const event = receipt.logs.find(
      (log: any) => log.fragment && log.fragment.name === "NewEmergencyOracle"
    );
    
    expect(event).to.not.be.undefined;
    expect(event.args.owner).to.equal(owner.address);
    expect(event.args.newOracle).to.be.properAddress;
  });
  
  // Helper to set admin status (assuming the contract has this function)
  async function setAdmin(factory: any, address: string, status: boolean) {
    // If the contract has a setAdmin function, use it
    // Otherwise, we need to directly set the mapping
    const adminRole = await factory.isAdmin(address);
    // If not admin, we can't test properly - but for this test we need to ensure owner is admin
    // In a real scenario, the deployer might already be admin or there's an initialization
  }
});