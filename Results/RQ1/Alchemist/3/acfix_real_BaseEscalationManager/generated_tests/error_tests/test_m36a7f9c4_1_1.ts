import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant m36a7f9c4 test", function () {
  it("should revert when calling assertionResolvedCallback from unauthorized address (not the optimistic asserter)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a mock OptimisticAsserter to pass as constructor argument
    // We need an actual address for the constructor, so we deploy a minimal contract
    const MockAsserterFactory = await ethers.getContractFactory(
      "contracts/mocks/MockOptimisticAsserter.sol:MockOptimisticAsserter"
    );
    const mockAsserter = await MockAsserterFactory.deploy();
    await mockAsserter.waitForDeployment();

    // Deploy BaseEscalationManager with the mock asserter address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();

    // Attempt to call assertionResolvedCallback from an unauthorized address (addr1)
    // The original contract should revert because it has onlyOptimisticAsserter modifier
    await expect(
      instance.connect(addr1).assertionResolvedCallback(
        ethers.encodeBytes32String("test-assertion-id"),
        true
      )
    ).to.be.revertedWith("Not the optimistic asserter");
  });
});