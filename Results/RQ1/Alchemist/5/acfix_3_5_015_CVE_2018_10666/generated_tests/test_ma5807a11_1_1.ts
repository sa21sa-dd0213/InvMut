import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls a function protected by onlyOwner modifier (kills mutant ma5807a11)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a test wrapper contract that exposes the onlyOwner modifier
    const TestFactory = await ethers.getContractFactory("OwnedTestWrapper");
    const testContract = await TestFactory.deploy();
    await testContract.waitForDeployment();

    // Transfer ownership to addr1 first
    await testContract.connect(owner).setOwner(addr1.address);
    
    // Now addr1 is owner, owner is not. Try calling the test function from owner (now non-owner)
    await expect(
      testContract.connect(owner).onlyOwnerFunction()
    ).to.be.reverted;

    // Also test from a completely non-owner address
    const [_, nonOwner] = await ethers.getSigners();
    await expect(
      testContract.connect(nonOwner).onlyOwnerFunction()
    ).to.be.reverted;
  });
});

// Helper contract to expose onlyOwner modifier for testing
// This contract must be compiled alongside the test contract
contract OwnedTestWrapper is Owned {
  function onlyOwnerFunction() external onlyOwner {
    // do nothing
  }
}