import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant detection - event emission", function () {
  it("should emit PriceRequestAdded when requestPrice is called by the optimistic asserter", async function () {
    // Deploy a mock OptimisticAsserter to act as the authorized caller
    const mockAsserterFactory = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockAsserter = await mockAsserterFactory.deploy();
    await mockAsserter.waitForDeployment();

    // Deploy BaseEscalationManager with the mock asserter address
    const factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();

    // Prepare test parameters
    const identifier = ethers.encodeBytes32String("test_identifier");
    const time = Math.floor(Date.now() / 1000);
    const ancillaryData = ethers.toUtf8Bytes("test ancillary data");

    // Call requestPrice from the mock asserter (authorized caller)
    // The mock asserter will forward the call to the BaseEscalationManager
    const tx = await mockAsserter.callRequestPrice(
      await instance.getAddress(),
      identifier,
      time,
      ancillaryData
    );

    // Wait for the transaction and check for the event
    const receipt = await tx.wait();

    // Verify that PriceRequestAdded was emitted with correct parameters
    await expect(tx)
      .to.emit(instance, "PriceRequestAdded")
      .withArgs(identifier, time, ancillaryData);
  });
});