import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant kill test - assertionDisputedCallback modifier removal", function () {
  it("should revert when calling assertionDisputedCallback from unauthorized address (onlyOptimisticAsserter modifier check)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock OptimisticAsserter that we can use as the constructor argument
    // Since BaseEscalationManager only stores the address and uses it for modifier checks,
    // we can deploy any contract that satisfies the interface
    const MockAsserterFactory = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockAsserter = await MockAsserterFactory.deploy();
    await mockAsserter.waitForDeployment();

    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();

    // Try calling assertionDisputedCallback from an unauthorized address (addr1)
    // The original contract should revert because of onlyOptimisticAsserter modifier
    // The mutant (without modifier) will not revert, thus killing the test
    await expect(
      instance.connect(addr1).assertionDisputedCallback(ethers.ZeroHash)
    ).to.be.revertedWith("Not the optimistic asserter");
  });
});