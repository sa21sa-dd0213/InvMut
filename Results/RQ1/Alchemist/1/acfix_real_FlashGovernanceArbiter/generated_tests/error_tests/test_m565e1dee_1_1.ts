import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - kill mutant m565e1dee (enforceTolerance)", function () {
  it("should revert when v1 > v2 and subtraction is replaced with addition", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a minimal DAO-like contract that satisfies the interface
    const DAOFactory = await ethers.getContractFactory("LimboDAOLike");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    
    // Deploy FlashGovernanceArbiter with the DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await dao.getAddress());
    await instance.waitForDeployment();
    
    // Deploy a minimal configurable contract that returns configured() = true
    const MinimalConfigurable = await ethers.getContractFactory("MinimalConfigurable");
    const minConfig = await MinimalConfigurable.deploy();
    await minConfig.waitForDeployment();
    
    // Set enforceLimitsActive for the configurable contract address
    await instance.connect(addr1).setEnforcement(true);
    
    // Now we need to set security.changeTolerance to 10
    // We can do this by calling configureSecurityParameters with onlySuccessfulProposal
    // Since we're the owner and DAO is set, we need to make owner a successful proposal
    // Let's use a simpler approach: set the storage directly
    
    // Get the storage slot for security struct
    // security is at slot 2 (0-indexed)
    const securitySlot = 2;
    const securityData = await ethers.provider.getStorage(await instance.getAddress(), securitySlot);
    
    // Parse the security struct:
    // uint256 epochSize (slot 0)
    // uint256 lastFlashGovernanceAct (slot 1)
    // uint8 maxGovernanceChangePerEpoch (slot 2, first byte)
    // uint8 changeTolerance (slot 2, second byte)
    
    // Set changeTolerance = 10 (0x0a) at the second byte of slot 2
    const currentValue = ethers.toBigInt(securityData);
    const mask = ~(BigInt(0xff) << BigInt(8)); // mask to clear the second byte
    const newValue = (currentValue & mask) | (BigInt(10) << BigInt(8));
    
    // Use hardhat_setStorageAt to set the storage
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x" + securitySlot.toString(16).padStart(64, "0"),
      "0x" + newValue.toString(16).padStart(64, "0")
    ]);
    
    // Now call enforceTolerance with v1=110, v2=100
    // This should pass on original but revert on mutant
    await expect(
      instance.connect(addr1).enforceTolerance(110, 100)
    ).to.be.revertedWith("FE1");
  });
});