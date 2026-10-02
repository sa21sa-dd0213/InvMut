import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant detection - mc1581a0b", function () {
  it("should revert when called from optimistic asserter address due to mutated modifier", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy a mock optimistic asserter contract first
    const MockOptimisticAsserter = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockAsserter = await MockOptimisticAsserter.deploy();
    await mockAsserter.waitForDeployment();
    
    // Deploy BaseEscalationManager with the mock asserter address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();
    
    // Create a call from the optimistic asserter address (the authorized caller in original)
    // In the mutant, this should revert because it uses != instead of ==
    const mockAsserterSigner = await ethers.getImpersonatedSigner(await mockAsserter.getAddress());
    await ethers.provider.send("hardhat_setBalance", [
      await mockAsserter.getAddress(),
      "0x1000000000000000000"
    ]);
    
    // Try to call requestPrice from the optimistic asserter address
    // In original: should succeed
    // In mutant: should revert because msg.sender != optimisticAsserter is false
    await expect(
      instance.connect(mockAsserterSigner).requestPrice(
        ethers.encodeBytes32String("test"),
        1234567890,
        "0x"
      )
    ).to.be.revertedWith("Not the optimistic asserter");
  });
});