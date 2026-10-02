import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should allow owner to call onlyOwner function (kill mutant that uses !=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Owned contract
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a test helper contract that inherits Owned and exposes a function with onlyOwner modifier
    const TestHelper = await ethers.getContractFactory("contract OwnedTest is Owned { function testOnlyOwner() public onlyOwner returns (bool) { return true; } }");
    const testContract = await TestHelper.deploy();
    await testContract.waitForDeployment();

    // Test from owner - should not revert on original, should revert on mutant
    await expect(testContract.connect(owner).testOnlyOwner()).to.not.be.reverted;

    // Test from non-owner - should revert on original, should not revert on mutant
    await expect(testContract.connect(addr1).testOnlyOwner()).to.be.reverted;
  });
});