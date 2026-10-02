import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory mutant test", function () {
  it("should emit NewEmergencyOracle event when newEmergencyOracle is called", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy EmergencyOracleFactory
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Set the jojoTeam address to allow newEmergencyOracle to be called
    // Note: The contract doesn't have a setter for jojoTeam, so we need to check the constructor
    // Looking at the contract, jojoTeam is not initialized in constructor, so it defaults to address(0)
    // We need to set it first. Since there's no setter, we'll need to deploy with the correct owner
    // Actually, let's redeploy with the owner as jojoTeam
    const Factory2 = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory2 = await Factory2.deploy();
    await factory2.waitForDeployment();
    
    // Set jojoTeam to the owner
    // Since jojoTeam is public, we can't set it directly. Let's check if there's a way...
    // Actually, looking at the contract more carefully, jojoTeam is a state variable with no setter
    // This means we need to deploy the contract with a constructor that sets jojoTeam
    // But the contract doesn't have a constructor! So jojoTeam will be address(0)
    // The onlyJojoTeam modifier will fail for any caller
    
    // Alternative approach: deploy a modified version for testing
    // Since we can't modify the contract, let's just test the event emission
    // by directly calling the function through the factory's owner
    
    // Actually, looking at the contract again, there's no constructor for EmergencyOracleFactory
    // so jojoTeam = address(0). The onlyJojoTeam modifier will always revert
    // Let's deploy with a custom setup
    
    // Since we can't change jojoTeam, let's just verify the event emission expectation
    // by calling the function from address(0) - but this will revert due to onlyJojoTeam
    
    // Let's take a different approach - deploy and check the event is emitted
    // when the function is called by the correct address
    
    // We need to deploy a contract where jojoTeam is set properly
    // Since there's no constructor, we'll use storage manipulation in test
    
    // Simpler approach: deploy and verify the event is NOT emitted when it should be
    // This tests the mutant which removes the event emission
    
    const Factory3 = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory3 = await Factory3.deploy();
    await factory3.waitForDeployment();
    
    // Get the storage slot for jojoTeam (slot 0)
    // Set jojoTeam to owner address
    await ethers.provider.send("hardhat_setStorageAt", [
      factory3.target,
      "0x0",
      ethers.zeroPadValue(owner.address, 32)
    ]);
    
    // Now call newEmergencyOracle and expect the event
    await expect(factory3.connect(owner).newEmergencyOracle("Test Oracle"))
      .to.emit(factory3, "NewEmergencyOracle")
      .withArgs(owner.address, ethers.anyValue); // The new oracle address is dynamic
    
    // Verify the event was emitted with correct parameters
    const filter = factory3.filters.NewEmergencyOracle(owner.address, null);
    const events = await factory3.queryFilter(filter, -1);
    expect(events.length).to.equal(1);
    expect(events[0].args.owner).to.equal(owner.address);
  });
});