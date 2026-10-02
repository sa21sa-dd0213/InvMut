import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant test - onlyOptimisticAsserter modifier", function () {
  it("should revert when called from the optimistic asserter address on the mutant (inverted access control)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock optimistic asserter contract that implements the required interface
    const MockOptimisticAsserterFactory = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockOptimisticAsserter = await MockOptimisticAsserterFactory.deploy();
    await mockOptimisticAsserter.waitForDeployment();
    
    // Deploy BaseEscalationManager with the mock asserter address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockOptimisticAsserter.getAddress());
    await instance.waitForDeployment();
    
    // Get the assertionId for testing
    const assertionId = ethers.keccak256(ethers.toUtf8Bytes("test-assertion"));
    
    // Test that the optimistic asserter can call assertionResolvedCallback (should succeed on original, fail on mutant)
    // On the mutant with !=, this call will revert because msg.sender == address(optimisticAsserter)
    await expect(
      instance.connect(mockOptimisticAsserter).assertionResolvedCallback(assertionId, true)
    ).to.not.be.reverted;
    
    // Test that the optimistic asserter can call assertionDisputedCallback (should succeed on original, fail on mutant)
    await expect(
      instance.connect(mockOptimisticAsserter).assertionDisputedCallback(assertionId)
    ).to.not.be.reverted;
  });
});

// Mock contract to act as the optimistic asserter
// This needs to be deployed as a separate contract file
// For the test to work, we need to deploy it first