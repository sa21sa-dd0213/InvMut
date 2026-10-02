import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant mbdfa9920 - access control removal", function () {
  it("should revert when requestPrice is called by an unauthorized address (not the optimisticAsserter)", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    
    // Deploy a mock OptimisticAsserter to pass to the constructor
    const MockOptimisticAsserter = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockAsserter = await MockOptimisticAsserter.deploy();
    await mockAsserter.waitForDeployment();
    
    // Deploy BaseEscalationManager with the mock asserter address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();
    
    // Attempt to call requestPrice from an unauthorized address (not the optimisticAsserter)
    await expect(
      instance.connect(unauthorized).requestPrice(
        ethers.encodeBytes32String("test_identifier"),
        1234567890,
        "0x"
      )
    ).to.be.revertedWith("Not the optimistic asserter");
  });
});

// Helper contract for testing - must be deployed alongside the test
// This mock implements only the address() function needed for constructor
contract MockOptimisticAsserter {
  function getAddress() external view returns (address) {
    return address(this);
  }
}