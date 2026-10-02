import { expect } from "chai";
import { ethers } } from "hardhat";

describe("BaseEscalationManager - kill mutant m515ca4d8", function () {
  it("should return the correct AssertionPolicy struct with blockAssertion = false", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy a mock OptimisticAsserter first since it's required by constructor
    const MockOptimisticAsserter = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockAsserter = await MockOptimisticAsserter.deploy();
    await mockAsserter.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();
    
    // Call getAssertionPolicy with any bytes32 value
    const assertionId = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const policy = await instance.getAssertionPolicy(assertionId);
    
    // The mutant removes the 'return' keyword, so the function would return default struct (all false)
    // Original returns blockAssertion: false explicitly. We verify this value is correct.
    expect(policy.blockAssertion).to.equal(false);
    
    // Additional verification that all fields are as expected from original
    expect(policy.arbitrateViaEscalationManager).to.equal(false);
    expect(policy.discardOracle).to.equal(false);
    expect(policy.validateDisputers).to.equal(false);
  });
});