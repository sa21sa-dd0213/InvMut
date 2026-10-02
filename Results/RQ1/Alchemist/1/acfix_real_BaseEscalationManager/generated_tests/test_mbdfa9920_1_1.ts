import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant mbdfa9920 detection", function () {
  it("should revert when non-optimisticAsserter calls requestPrice on original, but not on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock optimistic asserter to pass to constructor
    const MockOptimisticAsserter = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockAsserter = await MockOptimisticAsserter.deploy();
    await mockAsserter.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();
    
    // Attempt to call requestPrice from an unauthorized address (addr1)
    const identifier = ethers.encodeBytes32String("test");
    const time = 1000;
    const ancillaryData = "0x";
    
    // This should revert on the original contract due to onlyOptimisticAsserter modifier
    await expect(
      instance.connect(addr1).requestPrice(identifier, time, ancillaryData)
    ).to.be.revertedWith("Not the optimistic asserter");
  });
});