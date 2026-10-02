import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant detection", function () {
  it("should emit PriceRequestAdded when requestPrice is called by optimistic asserter", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock optimistic asserter first (since we need its address for constructor)
    const MockOptimisticAsserter = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockAsserter = await MockOptimisticAsserter.deploy();
    await mockAsserter.waitForDeployment();
    
    // Deploy BaseEscalationManager with mock asserter address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();
    
    // Prepare test parameters
    const identifier = ethers.encodeBytes32String("test");
    const time = Math.floor(Date.now() / 1000);
    const ancillaryData = ethers.toUtf8Bytes("test data");
    
    // Expect the event to be emitted when called from the optimistic asserter address
    await expect(
      instance.connect(mockAsserter.getSigner()).requestPrice(identifier, time, ancillaryData)
    )
      .to.emit(instance, "PriceRequestAdded")
      .withArgs(identifier, time, ancillaryData);
  });
});