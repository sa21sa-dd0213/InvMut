import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant detection - isDisputeAllowed", function () {
  it("should return true for isDisputeAllowed on original contract but false on mutant that removed return statement", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy a mock OptimisticAsserter first since BaseEscalationManager requires it in constructor
    const MockOptimisticAsserter = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockAsserter = await MockOptimisticAsserter.deploy();
    await mockAsserter.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();
    
    // Generate a random bytes32 for assertionId
    const assertionId = ethers.hexlify(ethers.randomBytes(32));
    
    // Call isDisputeAllowed - on original this returns true, on mutant it returns false (default bool)
    const result = await instance.isDisputeAllowed(assertionId, owner.address);
    
    // If the mutant removed the return true, this assertion will fail (result will be false)
    expect(result).to.equal(true);
  });
});