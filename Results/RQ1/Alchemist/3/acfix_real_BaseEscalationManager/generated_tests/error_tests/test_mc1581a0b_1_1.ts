import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant kill test", function () {
  it("should allow the optimistic asserter to call onlyOptimisticAsserter-protected functions", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock OptimisticAsserter contract to use as constructor argument
    const MockOptimisticAsserterFactory = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockAsserter = await MockOptimisticAsserterFactory.deploy();
    await mockAsserter.waitForDeployment();

    // Deploy BaseEscalationManager with the mock asserter address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();

    // Test calling assertionDisputedCallback from the optimistic asserter address
    // This should succeed on original (== check) but revert on mutant (!= check)
    await expect(
      instance.connect(addr1).assertionDisputedCallback(
        ethers.hexlify(ethers.randomBytes(32))
      )
    ).to.be.revertedWith("Not the optimistic asserter");

    // Now call from the actual optimistic asserter address - should succeed on original
    await expect(
      instance.connect(mockAsserter).assertionDisputedCallback(
        ethers.hexlify(ethers.randomBytes(32))
      )
    ).to.not.be.reverted;
  });
});