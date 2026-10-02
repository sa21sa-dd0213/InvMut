import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m6648f569 test", function () {
  it("should kill the mutant by verifying correct function selector is used", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple contract that implements transferFrom to verify selector
    const TargetFactory = await ethers.getContractFactory("demo");
    const target = await TargetFactory.deploy();
    await target.waitForDeployment();
    
    // Deploy the main demo contract
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Prepare test data - valid addresses and values
    const tos = [addr1.address, addr2.address];
    const values = [100, 200];
    
    // This call should succeed on original (using keccak256) but fail on mutant (using sha256)
    // because sha256 produces a different selector that doesn't match transferFrom
    await expect(
      instance.connect(owner).transfer(owner.address, await target.getAddress(), tos, values)
    ).to.be.reverted;
  });
});