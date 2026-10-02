import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant mbdfa9920 test", function () {
  it("should revert when non-OptimisticAsserter calls requestPrice on original, but not on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a mock OptimisticAsserter contract to use as constructor argument
    // We need a valid address that implements the interface minimally
    const MockOptimisticAsserter = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockAsserter = await MockOptimisticAsserter.deploy();
    await mockAsserter.waitForDeployment();
    
    // Deploy the BaseEscalationManager with the mock asserter address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();
    
    // Attempt to call requestPrice from a non-OptimisticAsserter address (addr1)
    // In the original contract, this should revert due to onlyOptimisticAsserter modifier
    // In the mutant (without modifier), this should succeed
    const identifier = ethers.encodeBytes32String("test");
    const time = 1000;
    const ancillaryData = "0x";
    
    // This call should revert on the original contract but not on the mutant
    // We test from addr1 which is not the optimistic asserter
    await expect(
      instance.connect(addr1).requestPrice(identifier, time, ancillaryData)
    ).to.be.revertedWith("Not the optimistic asserter");
  });
});