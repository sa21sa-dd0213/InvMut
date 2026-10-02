import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant detection - maedf983d", function () {
  it("should revert when calling assertionDisputedCallback from unauthorized address due to onlyOptimisticAsserter modifier", async function () {
    // Get signers
    const [owner, unauthorizedCaller] = await ethers.getSigners();

    // Deploy a mock OptimisticAsserter to use as constructor argument
    const MockOptimisticAsserterFactory = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockOptimisticAsserter = await MockOptimisticAsserterFactory.deploy();
    await mockOptimisticAsserter.waitForDeployment();

    // Deploy BaseEscalationManager with the mock asserter address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockOptimisticAsserter.getAddress());
    await instance.waitForDeployment();

    // Attempt to call assertionDisputedCallback from an unauthorized address
    // The original contract should revert with "Not the optimistic asserter"
    await expect(
      instance.connect(unauthorizedCaller).assertionDisputedCallback(ethers.ZeroHash)
    ).to.be.revertedWith("Not the optimistic asserter");
  });
});