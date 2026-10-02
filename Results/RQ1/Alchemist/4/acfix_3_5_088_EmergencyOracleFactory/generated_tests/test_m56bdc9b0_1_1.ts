import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory - kill mutant m56bdc9b0", function () {
  it("should emit NewEmergencyOracle event when creating a new oracle", async function () {
    const [owner] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Set owner as admin by directly writing to storage
    // isAdmin mapping is at slot 0
    const slot = ethers.zeroPadValue(ethers.toBeHex(0), 32);
    const key = ethers.zeroPadValue(owner.address, 32);
    const storageSlot = ethers.keccak256(ethers.concat([key, slot]));

    // Set owner as admin in storage
    await ethers.provider.send("hardhat_setStorageAt", [
      await factory.getAddress(),
      storageSlot,
      ethers.zeroPadValue(ethers.toBeHex(1), 32)
    ]);

    // Now call newEmergencyOracle as owner (admin)
    const description = "Test Oracle";
    const tx = await factory.connect(owner).newEmergencyOracle(description);

    // Expect the event to be emitted
    await expect(tx)
      .to.emit(factory, "NewEmergencyOracle")
      .withArgs(owner.address, ethers.anyValue);

    // Alternative: get the emitted event and verify
    const receipt = await tx.wait();
    const event = receipt.logs.find(
      (log) => log.address === await factory.getAddress()
    );
    expect(event).to.not.be.undefined;

    // Verify the event signature
    const eventSignature = ethers.id("NewEmergencyOracle(address,address)");
    expect(event.topics[0]).to.equal(eventSignature);
  });
});