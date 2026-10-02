import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager - kill mutant mdfd5211f (event emission removed from requestPrice)", function () {
  let instance: any;
  let mockOptimisticAsserter: any;
  let owner: any;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();

    // Deploy a mock contract that acts as the OptimisticAsserter to satisfy the constructor requirement
    const MockOptimisticAsserter = await ethers.getContractFactory("MockOptimisticAsserter");
    mockOptimisticAsserter = await MockOptimisticAsserter.deploy();
    await mockOptimisticAsserter.waitForDeployment();

    // Deploy BaseEscalationManager with the mock asserter address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    instance = await Factory.deploy(await mockOptimisticAsserter.getAddress());
    await instance.waitForDeployment();
  });

  it("should emit PriceRequestAdded event when requestPrice is called by the optimistic asserter", async function () {
    // Arrange: Prepare call parameters
    const identifier = ethers.encodeBytes32String("test-identifier");
    const time = 1234567890;
    const ancillaryData = ethers.toUtf8Bytes("test-ancillary");

    // Act: Call requestPrice from the optimistic asserter address (the only allowed caller)
    // We impersonate the optimistic asserter by using its signer
    const mockAsserterSigner = await ethers.getImpersonatedSigner(await mockOptimisticAsserter.getAddress());
    await ethers.setBalance(await mockOptimisticAsserter.getAddress(), ethers.parseEther("1"));

    // Assert: Expect the PriceRequestAdded event to be emitted with correct parameters
    await expect(
      instance.connect(mockAsserterSigner).requestPrice(identifier, time, ancillaryData)
    )
      .to.emit(instance, "PriceRequestAdded")
      .withArgs(identifier, time, ancillaryData);
  });
});