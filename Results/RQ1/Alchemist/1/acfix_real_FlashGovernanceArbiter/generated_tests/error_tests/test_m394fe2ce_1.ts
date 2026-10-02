import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant test - enforceTolerance boundary", function () {
  it("should revert when (v2 - v1) * 100 equals exactly security.changeTolerance * v1 (strict inequality check)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy FlashGovernanceArbiter with a DAO address
    const FlashGovernanceArbiter = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await FlashGovernanceArbiter.deploy(owner.address);
    await instance.waitForDeployment();

    // First, configure the security parameters to set changeTolerance
    // We need to call configureSecurityParameters which requires onlySuccessfulProposal
    // Since DAO is owner, we need to make owner a successful proposal first
    // We'll simulate by directly calling configureSecurityParameters after setting up
    
    // For the test, we need to bypass the onlySuccessfulProposal modifier
    // Let's use the DAO address as the sender to make a successful proposal
    // Set changeTolerance to 10 (meaning 10%)
    const maxGovernanceChangePerEpoch = 10;
    const epochSize = 100;
    const changeTolerance = 10;
    
    // We need to make the owner a successful proposal first
    // Since we can't easily do that in a test, let's set up the contract state
    // by calling configureSecurityParameters directly (it will revert without proper setup)
    
    // Alternative approach: test enforceTolerance directly after setting up the contract
    // Set up the security parameters through the constructor or direct state manipulation
    
    // Since we can't easily bypass modifiers in a test, let's test enforceTolerance
    // by calling it with the right conditions
    
    // First, let's set the security parameters by calling the function
    // This will revert without successful proposal, so we need to manipulate state directly
    // Let's use ethers to set the storage slot for security.changeTolerance
    
    // Get storage slot for security struct (slot 2 in this contract)
    // security struct layout: epochSize (uint256), lastFlashGovernanceAct (uint256), maxGovernanceChangePerEpoch (uint8), changeTolerance (uint8)
    // Slot 2: epochSize (0), Slot 3: lastFlashGovernanceAct (1), Slot 4: packed for maxGovernanceChangePerEpoch and changeTolerance
    
    // For simplicity, let's use a different approach - call enforceTolerance with conditions that hit the boundary
    
    // We need to set enforceLimitsActive[msg.sender] = true and make Configurable(msg.sender).configured() return true
    // This requires setting up a contract that implements Configurable
    
    // Let's deploy a simple contract that returns configured() = true
    const ConfigurableMock = await ethers.getContractFactory("contracts/test/ConfigurableMock.sol:ConfigurableMock");
    const configurable = await ConfigurableMock.deploy();
    await configurable.waitForDeployment();
    
    // Enable enforcement for the configurable contract
    await instance.connect(owner).setEnforcement(true);
    
    // Now set the security.changeTolerance to 10 through storage manipulation
    // The security struct is at slot 2 (after flashGovernanceConfig at slot 0 and 1)
    // changeTolerance is the last element, packed with maxGovernanceChangePerEpoch at slot 4 (0x04)
    
    // Set changeTolerance = 10 (0x0a) and maxGovernanceChangePerEpoch = 10 (0x0a)
    // Packed as: 0x0a0a (maxGovernanceChangePerEpoch is first byte, changeTolerance is second byte)
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x4",
      "0x0000000000000000000000000000000000000000000000000000000000000a0a"
    ]);
    
    // Now test the boundary condition
    // If changeTolerance = 10, then the formula is: (v2 - v1) * 100 < changeTolerance * v1
    // With v1 = 100, v2 = 110: (110 - 100) * 100 = 1000, changeTolerance * v1 = 10 * 100 = 1000
    // Original: 1000 < 1000 => false => revert
    // Mutant: 1000 <= 1000 => true => pass
    
    // This should revert in the original but pass in the mutant
    await expect(
      instance.connect(configurable).enforceTolerance(100, 110)
    ).to.be.revertedWith("FE1");
    
    // Also test with v1 > v2 boundary
    // v1 = 110, v2 = 100: (110 - 100) * 100 = 1000, changeTolerance * v2 = 10 * 100 = 1000
    // Original: 1000 < 1000 => false => revert
    await expect(
      instance.connect(configurable).enforceTolerance(110, 100)
    ).to.be.revertedWith("FE1");
  });
});