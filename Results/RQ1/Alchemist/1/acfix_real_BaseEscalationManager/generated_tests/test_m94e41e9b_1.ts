import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant kill test - m94e41e9b", function () {
  it("should revert when calling onlyOptimisticAsserter-protected functions from unauthorized address", async function () {
    // Get signers
    const [owner, unauthorizedUser] = await ethers.getSigners();

    // Deploy a mock OptimisticAsserter first (needed for constructor)
    // Since we need a real address for the constructor, we'll deploy a simple mock
    const OptimisticAsserterMock = await ethers.getContractFactory("OptimisticAsserterMock");
    const mockAsserter = await OptimisticAsserterMock.deploy();
    await mockAsserter.waitForDeployment();

    // Deploy BaseEscalationManager with the mock asserter address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();

    // Test that calling requestPrice from unauthorized address reverts
    // The original contract should revert with "Not the optimistic asserter"
    // The mutant without the require statement would not revert, thus killing it
    await expect(
      instance.connect(unauthorizedUser).requestPrice(
        ethers.encodeBytes32String("test"),
        123456,
        "0x"
      )
    ).to.be.revertedWith("Not the optimistic asserter");

    // Also test assertionResolvedCallback
    await expect(
      instance.connect(unauthorizedUser).assertionResolvedCallback(
        ethers.encodeBytes32String("assertion1"),
        true
      )
    ).to.be.revertedWith("Not the optimistic asserter");

    // Also test assertionDisputedCallback
    await expect(
      instance.connect(unauthorizedUser).assertionDisputedCallback(
        ethers.encodeBytes32String("assertion2")
      )
    ).to.be.revertedWith("Not the optimistic asserter");
  });
});

// Helper contract to act as mock OptimisticAsserter for deployment
// This contract needs to be deployed as a separate file or in the same file
contract OptimisticAsserterMock {
  // Minimal mock to satisfy constructor requirement
}