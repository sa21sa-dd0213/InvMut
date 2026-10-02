import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant detection", function () {
  it("should fail to deploy mutant due to missing return statement in getAssertionPolicy", async function () {
    // The mutant removes the 'return' keyword from getAssertionPolicy function,
    // causing a compilation error. The deployment should revert.
    const [owner] = await ethers.getSigners();
    
    // Deploy a mock OptimisticAsserter first since it's required by constructor
    const MockOptimisticAsserterFactory = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockAsserter = await MockOptimisticAsserterFactory.deploy();
    await mockAsserter.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    
    // The deployment should fail because the mutant contract has a compilation error
    await expect(
      Factory.deploy(await mockAsserter.getAddress())
    ).to.be.reverted;
  });
});