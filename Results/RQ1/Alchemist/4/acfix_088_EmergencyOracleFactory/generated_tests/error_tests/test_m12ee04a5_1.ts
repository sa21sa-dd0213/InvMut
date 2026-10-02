import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory mutant detection", function () {
  it("should detect missing event emission in newEmergencyOracle", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy EmergencyOracleFactory with owner as jojoTeam
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();
    
    // Set the jojoTeam address to owner
    // Note: jojoTeam is initially address(0) in the contract, so we need to set it
    // Since there's no setter in the contract, we'll directly manipulate storage
    // Actually, looking at the contract, jojoTeam is not initialized in constructor
    // We need to check the actual deployment - let's use a different approach
    
    // The contract has no constructor, so jojoTeam will be address(0)
    // We need to set it to owner first - but there's no setter function
    // Let's check the contract again... there's no way to set jojoTeam externally
    // So we'll deploy with a modified approach
    
    // Actually, we can use ethers to set storage slot directly
    // But for a proper test, let's assume we can deploy with jojoTeam set
    
    // Re-deploy with a contract that has jojoTeam set
    // Since we can't modify the contract, let's use the fact that onlyJojoTeam
    // checks msg.sender == jojoTeam, and jojoTeam is public variable
    
    // The simplest approach: deploy and then use ethers to set the storage
    const jojoTeamSlot = ethers.keccak256(ethers.toUtf8Bytes("jojoTeam"));
    // Actually, let's just deploy and test with the owner as the caller
    // Since jojoTeam is address(0) initially, we need to set it
    
    // Let's use a different approach - deploy with constructor args if any
    // The contract has no constructor, so we need to set jojoTeam via storage
    
    // Get the storage slot for jojoTeam (first storage variable)
    const slot = ethers.hexlify(ethers.zeroPadValue("0x0", 32));
    await ethers.provider.send("hardhat_setStorageAt", [
      await factory.getAddress(),
      slot,
      ethers.zeroPadValue(owner.address, 32)
    ]);
    
    // Now call newEmergencyOracle from owner (who is now jojoTeam)
    const description = "Test Oracle";
    
    // Get the event before calling
    await expect(
      factory.connect(owner).newEmergencyOracle(description)
    )
      .to.emit(factory, "NewEmergencyOracle")
      .withArgs(owner.address, ethers.anyValue);
    
    // Get the deployed oracle address
    const oracleAddress = await ethers.provider.getStorage(
      await factory.getAddress(),
      0
    );
    // Actually, we should check the event emitted the correct oracle address
    // Let's get the oracle from the event logs
    const filter = factory.filters.NewEmergencyOracle(owner.address);
    const events = await factory.queryFilter(filter, -1);
    expect(events.length).to.equal(1);
  });
});