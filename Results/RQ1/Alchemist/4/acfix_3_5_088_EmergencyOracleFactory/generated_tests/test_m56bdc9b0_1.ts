import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory - kill mutant m56bdc9b0", function () {
  it("should emit NewEmergencyOracle event when creating a new oracle", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Set owner as admin
    await factory.isAdmin(owner.address);
    
    // Need to make owner an admin first - check the contract structure
    // The isAdmin mapping is public, we need to set it via some function
    // Since there's no addAdmin function, we'll deploy with owner as admin
    // Actually, looking at the contract, isAdmin is a public mapping but no setter
    // So we need to understand how admin is set - it's not in the constructor
    // For testing, we'll directly set the mapping using storage or find another way
    // Let's check if there's an alternative approach
    
    // The contract has no constructor that sets admin, so we need to handle this
    // We'll use ethers to set the storage slot directly for testing
    // Or we can check if the contract has any admin setup mechanism
    
    // Since the contract has no admin setup function, we'll test with the assumption
    // that the deployer might need to be admin. Let's check if msg.sender in the 
    // constructor context can set admin - it doesn't appear so.
    
    // For the test to work, we'll directly manipulate storage to set owner as admin
    // Get storage slot for isAdmin mapping (slot 0)
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
      .withArgs(owner.address, anyValue); // anyValue because we don't know the exact address
    
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