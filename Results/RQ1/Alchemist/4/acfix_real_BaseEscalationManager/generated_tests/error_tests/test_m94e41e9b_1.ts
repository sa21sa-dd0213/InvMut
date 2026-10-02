import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant m94e41e9b test", function () {
  it("should revert when calling onlyOptimisticAsserter functions from unauthorized address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock OptimisticAsserter to pass as constructor argument
    const mockOptimisticAsserter = await ethers.deployContract("MockOptimisticAsserter");
    await mockOptimisticAsserter.waitForDeployment();
    
    // Deploy BaseEscalationManager with the mock asserter address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockOptimisticAsserter.getAddress());
    await instance.waitForDeployment();
    
    // Create a random assertionId
    const assertionId = ethers.keccak256(ethers.toUtf8Bytes("test-assertion"));
    
    // Try calling assertionResolvedCallback from unauthorized address (addr1)
    // In the original contract this should revert, but in the mutant it won't
    await expect(
      instance.connect(addr1).assertionResolvedCallback(assertionId, true)
    ).to.be.revertedWith("Not the optimistic asserter");
    
    // Also test assertionDisputedCallback
    await expect(
      instance.connect(addr1).assertionDisputedCallback(assertionId)
    ).to.be.revertedWith("Not the optimistic asserter");
    
    // Also test requestPrice
    await expect(
      instance.connect(addr1).requestPrice(
        ethers.encodeBytes32String("test-identifier"),
        1234567890,
        "0x"
      )
    ).to.be.revertedWith("Not the optimistic asserter");
  });
});