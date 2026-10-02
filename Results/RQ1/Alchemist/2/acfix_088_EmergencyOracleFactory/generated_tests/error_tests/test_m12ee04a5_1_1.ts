import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory mutant test", function () {
  it("should emit NewEmergencyOracle event when newEmergencyOracle is called", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy EmergencyOracleFactory
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Get the storage slot for jojoTeam (slot 0)
    // Set jojoTeam to owner address
    await ethers.provider.send("hardhat_setStorageAt", [
      factory.target,
      "0x0",
      ethers.zeroPadValue(owner.address, 32)
    ]);
    
    // Now call newEmergencyOracle and expect the event
    await expect(factory.connect(owner).newEmergencyOracle("Test Oracle"))
      .to.emit(factory, "NewEmergencyOracle")
      .withArgs(owner.address, ethers.anyValue); // The new oracle address is dynamic
    
    // Verify the event was emitted with correct parameters
    const filter = factory.filters.NewEmergencyOracle(owner.address, null);
    const events = await factory.queryFilter(filter, -1);
    expect(events.length).to.equal(1);
    expect(events[0].args.owner).to.equal(owner.address);
  });
});