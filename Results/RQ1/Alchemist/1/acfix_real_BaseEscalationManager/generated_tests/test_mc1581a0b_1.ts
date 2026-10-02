import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant kill test", function () {
  it("should revert when called from non-OptimisticAsserter, but succeed when called from the OptimisticAsserter address", async function () {
    // Get signers
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock OptimisticAsserter contract that we can use as the authorized caller
    // Since BaseEscalationManager expects an address in constructor, we deploy a simple contract
    const MockAsserterFactory = await ethers.getContractFactory("contracts/test/MockOptimisticAsserter.sol:MockOptimisticAsserter");
    const mockAsserter = await MockAsserterFactory.deploy();
    await mockAsserter.waitForDeployment();
    
    // Deploy BaseEscalationManager with the mock asserter address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();
    
    // Test 1: Call from unauthorized address should revert (original behavior)
    // This tests that the modifier works for unauthorized callers
    const identifier = ethers.encodeBytes32String("test");
    const time = 1000;
    const ancillaryData = "0x";
    
    await expect(
      instance.connect(addr1).requestPrice(identifier, time, ancillaryData)
    ).to.be.revertedWith("Not the optimistic asserter");
    
    // Test 2: Call from the OptimisticAsserter address should succeed
    // This will kill the mutant because the mutant would revert here
    await expect(
      instance.connect(mockAsserter).requestPrice(identifier, time, ancillaryData)
    ).to.not.be.reverted;
    
    // Verify the event was emitted to confirm the call succeeded
    await expect(
      instance.connect(mockAsserter).requestPrice(identifier, time, ancillaryData)
    )
      .to.emit(instance, "PriceRequestAdded")
      .withArgs(identifier, time, ancillaryData);
  });
});