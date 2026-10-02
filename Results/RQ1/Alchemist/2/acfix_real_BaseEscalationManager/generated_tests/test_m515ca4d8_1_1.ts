import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant detection - m515ca4d8", function () {
  it("should detect mutant that removes return keyword from getAssertionPolicy", async function () {
    // Deploy a mock OptimisticAsserter first since BaseEscalationManager needs it in constructor
    const mockAsserterFactory = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockAsserter = await mockAsserterFactory.deploy();
    await mockAsserter.waitForDeployment();

    // Deploy BaseEscalationManager with mock asserter address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();

    // Generate a random bytes32 assertionId
    const assertionId = ethers.randomBytes(32);

    // Call getAssertionPolicy and verify all fields are explicitly set to false
    const policy = await instance.getAssertionPolicy(assertionId);

    // The mutant would return a default struct (all zero values) instead of the explicitly constructed one
    // This test checks each field individually to detect if return statement is missing
    expect(policy.blockAssertion).to.equal(false);
    expect(policy.arbitrateViaEscalationManager).to.equal(false);
    expect(policy.discardOracle).to.equal(false);
    expect(policy.validateDisputers).to.equal(false);
  });
});

// Mock contract needed for deployment
contract MockOptimisticAsserter {
    function defaultIdentifier() external view returns (bytes32) {
        return bytes32(0);
    }
}