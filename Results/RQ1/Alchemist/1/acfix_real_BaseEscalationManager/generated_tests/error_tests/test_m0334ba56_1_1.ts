import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant test - isDisputeAllowed", function () {
  it("should return true for isDisputeAllowed when called with any valid assertionId and disputeCaller", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy a mock OptimisticAsserterInterface contract to satisfy constructor requirements
    const MockOptimisticAsserter = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockAsserter = await MockOptimisticAsserter.deploy();
    await mockAsserter.waitForDeployment();
    
    // Deploy BaseEscalationManager with the mock asserter address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();
    
    // Test that isDisputeAllowed returns true by default
    const assertionId = ethers.keccak256(ethers.toUtf8Bytes("test-assertion"));
    const disputeCaller = ethers.Wallet.createRandom().address;
    
    const result = await instance.isDisputeAllowed(assertionId, disputeCaller);
    expect(result).to.equal(true);
  });
});