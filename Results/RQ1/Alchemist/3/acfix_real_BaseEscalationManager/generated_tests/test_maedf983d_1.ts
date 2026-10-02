import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant kill test - maedf983d", function () {
  it("should revert when assertionDisputedCallback is called from unauthorized address", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    
    // Deploy a mock OptimisticAsserter that just returns the address
    const MockAsserter = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockAsserter = await MockAsserter.deploy();
    await mockAsserter.waitForDeployment();

    // Deploy BaseEscalationManager with the mock asserter address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();

    // Attempt to call assertionDisputedCallback from an unauthorized address
    // This should revert in the original (with modifier) but succeed in the mutant
    const assertionId = ethers.keccak256(ethers.toUtf8Bytes("test-assertion"));
    
    await expect(
      instance.connect(unauthorized).assertionDisputedCallback(assertionId)
    ).to.be.revertedWith("Not the optimistic asserter");
  });
});

// Helper contract to act as a minimal OptimisticAsserter for deployment
contract MockOptimisticAsserter {
  // No functions needed, just need an address for the constructor
}