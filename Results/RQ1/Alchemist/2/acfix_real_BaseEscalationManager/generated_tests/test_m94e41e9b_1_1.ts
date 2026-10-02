import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant test - onlyOptimisticAsserter modifier removal", function () {
  it("should revert when calling assertionResolvedCallback from unauthorized address", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock OptimisticAsserter to use as constructor argument
    const MockOptimisticAsserterFactory = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockAsserter = await MockOptimisticAsserterFactory.deploy();
    await mockAsserter.waitForDeployment();

    // Deploy BaseEscalationManager with the mock asserter address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();

    // Create a dummy assertionId (bytes32)
    const assertionId = ethers.keccak256(ethers.toUtf8Bytes("test-assertion"));

    // Attempt to call assertionResolvedCallback from unauthorized address (addr1)
    // In the original contract, this should revert with "Not the optimistic asserter"
    // In the mutant (where the modifier is removed), it will succeed instead of reverting
    await expect(
      instance.connect(addr1).assertionResolvedCallback(assertionId, true)
    ).to.be.revertedWith("Not the optimistic asserter");
  });

  it("should revert when calling assertionDisputedCallback from unauthorized address", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock OptimisticAsserter to use as constructor argument
    const MockOptimisticAsserterFactory = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockAsserter = await MockOptimisticAsserterFactory.deploy();
    await mockAsserter.waitForDeployment();

    // Deploy BaseEscalationManager with the mock asserter address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();

    // Create a dummy assertionId (bytes32)
    const assertionId = ethers.keccak256(ethers.toUtf8Bytes("test-assertion"));

    // Attempt to call assertionDisputedCallback from unauthorized address (addr1)
    // In the original contract, this should revert with "Not the optimistic asserter"
    // In the mutant (where the modifier is removed), it will succeed instead of reverting
    await expect(
      instance.connect(addr1).assertionDisputedCallback(assertionId)
    ).to.be.revertedWith("Not the optimistic asserter");
  });

  it("should revert when calling requestPrice from unauthorized address", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock OptimisticAsserter to use as constructor argument
    const MockOptimisticAsserterFactory = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockAsserter = await MockOptimisticAsserterFactory.deploy();
    await mockAsserter.waitForDeployment();

    // Deploy BaseEscalationManager with the mock asserter address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();

    // Create dummy parameters
    const identifier = ethers.encodeBytes32String("test-identifier");
    const time = 1000;
    const ancillaryData = "0x";

    // Attempt to call requestPrice from unauthorized address (addr1)
    // In the original contract, this should revert with "Not the optimistic asserter"
    // In the mutant (where the modifier is removed), it will succeed instead of reverting
    await expect(
      instance.connect(addr1).requestPrice(identifier, time, ancillaryData)
    ).to.be.revertedWith("Not the optimistic asserter");
  });
});