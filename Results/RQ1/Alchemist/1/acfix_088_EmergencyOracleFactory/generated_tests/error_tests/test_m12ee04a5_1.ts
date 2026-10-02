import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory mutant test - m12ee04a5", function () {
  it("should emit NewEmergencyOracle event when creating a new oracle, killing the mutant that removes the event emission", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy EmergencyOracleFactory - constructor takes no arguments
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Set the owner as the jojoTeam address
    await factory.setJojoTeam(owner.address);
    
    // Create a new emergency oracle and verify event emission
    const description = "Test Oracle";
    const tx = await factory.connect(owner).newEmergencyOracle(description);
    const receipt = await tx.wait();
    
    // Check that the NewEmergencyOracle event was emitted
    // The event should have owner (msg.sender) and newOracle address as topics
    const event = receipt.logs.find(
      (log: any) => log.topics[0] === ethers.id("NewEmergencyOracle(address,address)")
    );
    
    expect(event).to.not.be.undefined;
    
    // Verify event parameters
    const decodedEvent = factory.interface.parseLog({
      topics: event.topics as string[],
      data: event.data
    });
    
    expect(decodedEvent?.args.owner).to.equal(owner.address);
    expect(decodedEvent?.args.newOracle).to.be.properAddress;
  });
});