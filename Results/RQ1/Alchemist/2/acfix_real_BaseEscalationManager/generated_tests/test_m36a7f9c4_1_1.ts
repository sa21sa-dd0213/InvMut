import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant m36a7f9c4 - kill test", function () {
  it("should revert when assertionResolvedCallback is called from an unauthorized address (not optimisticAsserter)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock OptimisticAsserter to use as constructor argument
    // We need a valid address for the optimisticAsserter contract
    const mockAsserterFactory = await ethers.getContractFactory("OptimisticAsserterMock");
    const mockAsserter = await mockAsserterFactory.deploy();
    await mockAsserter.waitForDeployment();

    // Deploy BaseEscalationManager with the mock asserter address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();

    // Generate a random bytes32 assertionId for testing
    const assertionId = ethers.hexlify(ethers.randomBytes(32));

    // Call assertionResolvedCallback from an unauthorized address (addr1)
    // This should revert on the original contract due to onlyOptimisticAsserter modifier
    await expect(
      instance.connect(addr1).assertionResolvedCallback(assertionId, true)
    ).to.be.revertedWith("Not the optimistic asserter");
  });
});