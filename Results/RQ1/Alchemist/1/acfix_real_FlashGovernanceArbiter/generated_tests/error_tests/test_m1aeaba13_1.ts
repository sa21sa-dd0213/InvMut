import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant m1aeaba13", function () {
  it("should not revert when enforceTolerance is called with v1=0 and v2=0 (mutant incorrectly requires v1>=1)", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy with a DAO address (any address since we're not testing governance here)
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // The enforceTolerance function checks if enforceLimitsActive[msg.sender] is true
    // and if Configurable(msg.sender).configured() returns true.
    // Since we're calling from the owner address which is also the DAO,
    // we need to set enforcement active for the caller first.
    await instance.setEnforcement(true);

    // Call enforceTolerance with v1=0 and v2=0
    // Original: v1 <= 1 => 0 <= 1 => true (no revert)
    // Mutant: v1 >= 1 => 0 >= 1 => false (reverts with "FE1")
    // This should NOT revert in the original, but WILL revert in the mutant
    await expect(instance.enforceTolerance(0, 0)).to.not.be.reverted;
  });
});