import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant kill test", function () {
  it("should revert when calling assertionResolvedCallback from unauthorized address but succeed from optimisticAsserter", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a mock optimistic asserter that we control
    const MockOptimisticAsserter = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockAsserter = await MockOptimisticAsserter.deploy();
    await mockAsserter.waitForDeployment();
    
    // Deploy BaseEscalationManager with the mock asserter address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();
    
    const instanceAddress = await instance.getAddress();
    
    // Test that calling assertionResolvedCallback from the optimistic asserter address succeeds
    // In the original contract, this should succeed; in the mutant it will revert
    await expect(
      mockAsserter.callAssertionResolvedCallback(instanceAddress, ethers.randomBytes(32), true)
    ).to.not.be.reverted;
    
    // Verify that calling from any other address reverts
    await expect(
      instance.connect(addr1).assertionResolvedCallback(ethers.randomBytes(32), true)
    ).to.be.revertedWith("Not the optimistic asserter");
  });
});