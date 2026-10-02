import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant m0334ba56", function () {
  it("should kill mutant by checking isDisputeAllowed returns true", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy a mock OptimisticAsserter first since BaseEscalationManager requires it in constructor
    const MockOptimisticAsserterFactory = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockAsserter = await MockOptimisticAsserterFactory.deploy();
    await mockAsserter.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();
    
    // The original contract returns true for any inputs
    // The mutant returns false (default value) because return true; was removed
    const result = await instance.isDisputeAllowed(
      ethers.keccak256(ethers.toUtf8Bytes("test-assertion")),
      owner.address
    );
    
    // This assertion will fail on the mutant (returns false) and pass on the original (returns true)
    expect(result).to.equal(true);
  });
});