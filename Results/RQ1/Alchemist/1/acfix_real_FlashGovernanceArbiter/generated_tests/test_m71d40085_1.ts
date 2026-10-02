import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - kill mutant m71d40085", function () {
  it("should revert on mutant when configured is false and values violate tolerance, but pass on original", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy with a valid DAO address (can be owner for testing)
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // At this point, configured is false (not yet set to true)
    // Call enforceToleranceInt with values that would violate tolerance
    // v1 = 100, v2 = 0 => v1 > v2, v2 == 0, so requires v1 <= 1, which will fail
    // Original would return early because !configured is true
    // Mutant would proceed and revert
    await expect(
      instance.enforceToleranceInt(100, 0)
    ).to.not.be.reverted; // Should pass on original, but will revert on mutant
  });
});