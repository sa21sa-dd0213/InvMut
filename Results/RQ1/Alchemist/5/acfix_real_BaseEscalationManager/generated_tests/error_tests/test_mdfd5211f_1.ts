import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant detection - requestPrice event emission", function () {
  it("should emit PriceRequestAdded when requestPrice is called by the optimistic asserter", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy a mock OptimisticAsserter that will be used as the constructor argument
    // We need an address that can call onlyOptimisticAsserter functions
    const MockOptimisticAsserter = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockAsserter = await MockOptimisticAsserter.deploy();
    await mockAsserter.waitForDeployment();
    
    // Deploy BaseEscalationManager with the mock asserter address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();
    
    // Prepare test parameters
    const identifier = ethers.encodeBytes32String("test");
    const time = Math.floor(Date.now() / 1000);
    const ancillaryData = "0x";
    
    // Call requestPrice through the mock asserter (which has the onlyOptimisticAsserter permission)
    // We'll use the mock asserter to call requestPrice on behalf of the actual contract
    const tx = await mockAsserter.callRequestPrice(
      await instance.getAddress(),
      identifier,
      time,
      ancillaryData
    );
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    
    // Verify the event was emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "PriceRequestAdded")
      .withArgs(identifier, time, ancillaryData);
  });
});