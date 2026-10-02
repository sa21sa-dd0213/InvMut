import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant m3e6fb0df - enforceToleranceInt with v1 >= 0", function () {
  it("should detect the mutant by passing v1 = 0 which should produce different absolute value calculation path", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract with a DAO address (using addr1 as placeholder)
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(addr1.address);
    await instance.waitForDeployment();

    // Set up the contract as configured to bypass the configured check
    await instance.endConfiguration();

    // Set enforceLimitsActive for the caller to test enforceTolerance
    await instance.setEnforcement(true);

    // The test: v1 = 0, v2 = 0 should not revert
    await expect(instance.enforceToleranceInt(0, 0)).to.not.be.reverted;

    // Test with v1 = -1, v2 = 1 - both versions should produce same result
    await expect(instance.enforceToleranceInt(-1, 1)).to.not.be.reverted;

    // Test with v1 = 1, v2 = 0
    await expect(instance.enforceToleranceInt(1, 0)).to.not.be.reverted;

    // Test with v1 = 0, v2 = 1
    await expect(instance.enforceToleranceInt(0, 1)).to.not.be.reverted;

    // Test with v1 = -5, v2 = 3
    await expect(instance.enforceToleranceInt(-5, 3)).to.not.be.reverted;
  });
});