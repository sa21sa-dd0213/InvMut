import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant test - isDisputeAllowed", function () {
  it("should return true when calling isDisputeAllowed (kills mutant that removes return true)", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy a mock OptimisticAsserter since BaseEscalationManager requires it in constructor
    const MockOptimisticAsserter = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockAsserter = await MockOptimisticAsserter.deploy();
    await mockAsserter.waitForDeployment();
    
    // Deploy BaseEscalationManager with the mock asserter address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();

    // Call isDisputeAllowed with any valid assertion ID and any dispute caller
    const assertionId = ethers.hexlify(ethers.randomBytes(32));
    const disputeCaller = owner.address;
    
    const result = await instance.isDisputeAllowed(assertionId, disputeCaller);
    
    // The original returns true, the mutant returns false (default bool value)
    // This assertion will fail on the mutant, thus killing it
    expect(result).to.equal(true);
  });
});