import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant kill test", function () {
  it("should kill mutant m0c59685d by exploiting the arithmetic change from multiplication to addition in enforceTolerance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy FlashGovernanceArbiter with a DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();
    
    // Configure the contract to set the DAO and complete configuration
    await instance.setDAO(owner.address);
    await instance.endConfiguration();
    
    // Configure security parameters with changeTolerance set to 50 (50%)
    // This means the tolerance check is: (v2 - v1) * 100 < 50 * v1
    await instance.configureSecurityParameters(10, 100, 50);
    
    // Enable enforcement for addr1
    await instance.connect(addr1).setEnforcement(true);
    
    // For the original: v1=100, v2=150
    // (v2 - v1) * 100 = 50 * 100 = 5000
    // security.changeTolerance * v1 = 50 * 100 = 5000
    // 5000 < 5000 is false, so original would revert
    
    // For the mutant: (v2 - v1) + 100 = 50 + 100 = 150
    // security.changeTolerance * v1 = 50 * 100 = 5000
    // 150 < 5000 is true, so mutant would NOT revert
    
    // We need values where:
    // Original: (v2 - v1) * 100 >= security.changeTolerance * v1 (revert)
    // Mutant: (v2 - v1) + 100 < security.changeTolerance * v1 (no revert)
    
    // Using v1=100, v2=150:
    // Original: 5000 >= 5000 -> revert (original)
    // Mutant: 150 < 5000 -> no revert (mutant)
    // This kills the mutant because original reverts but mutant doesn't
    
    await expect(
      instance.connect(addr1).enforceTolerance(100, 150)
    ).to.be.revertedWith("FE1");
  });
});