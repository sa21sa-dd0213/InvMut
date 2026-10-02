import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant test", function () {
  it("should revert when non-optimisticAsserter calls assertionDisputedCallback", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock optimistic asserter contract that satisfies the interface
    // Since BaseEscalationManager only needs an address for optimisticAsserter,
    // we can deploy a simple contract that implements the required interface
    const MockOptimisticAsserter = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockAsserter = await MockOptimisticAsserter.deploy();
    await mockAsserter.waitForDeployment();

    // Deploy BaseEscalationManager with the mock asserter address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();

    // Generate a random bytes32 assertionId
    const assertionId = ethers.hexlify(ethers.randomBytes(32));

    // Call from an unauthorized address (addr1) - should revert in original but not in mutant
    await expect(
      instance.connect(addr1).assertionDisputedCallback(assertionId)
    ).to.be.revertedWith("Not the optimistic asserter");
  });
});