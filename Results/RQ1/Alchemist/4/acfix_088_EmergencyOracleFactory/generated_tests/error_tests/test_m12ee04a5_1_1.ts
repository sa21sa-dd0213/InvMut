import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory mutant detection", function () {
  it("should detect missing event emission in newEmergencyOracle", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy EmergencyOracleFactory
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Set jojoTeam to owner using hardhat_setStorageAt
    const factoryAddress = await factory.getAddress();
    const slot = ethers.hexlify(ethers.zeroPadValue("0x0", 32));
    await ethers.provider.send("hardhat_setStorageAt", [
      factoryAddress,
      slot,
      ethers.zeroPadValue(owner.address, 32)
    ]);

    const description = "Test Oracle";

    // Call newEmergencyOracle and expect the event
    await expect(
      factory.connect(owner).newEmergencyOracle(description)
    )
      .to.emit(factory, "NewEmergencyOracle")
      .withArgs(owner.address, ethers.anyValue);

    // Verify event was emitted with correct parameters
    const filter = factory.filters.NewEmergencyOracle(owner.address);
    const events = await factory.queryFilter(filter, -1);
    expect(events.length).to.equal(1);
    
    // Verify the emitted oracle address is not zero
    const oracleAddress = events[0].args[1];
    expect(oracleAddress).to.not.equal(ethers.ZeroAddress);
  });
});