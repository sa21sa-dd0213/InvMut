import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant m36a7f9c4", function () {
  it("should revert when calling assertionResolvedCallback from unauthorized address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock OptimisticAsserter that the contract can reference
    // Since we need a real address for the constructor, we'll use a simple approach
    // Deploy a minimal contract that acts as the asserter
    const MockAsserter = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockAsserter = await MockAsserter.deploy();
    await mockAsserter.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();
    
    // Attempt to call assertionResolvedCallback from an unauthorized address (not the optimisticAsserter)
    await expect(
      instance.connect(addr1).assertionResolvedCallback(
        ethers.keccak256(ethers.toUtf8Bytes("test-assertion")),
        true
      )
    ).to.be.revertedWith("Not the optimistic asserter");
  });
});

// Helper contract to provide a valid OptimisticAsserterInterface address
// This is a minimal mock that satisfies the interface requirements
contract MockOptimisticAsserter {
  // Empty implementation - only needed for address reference
}