import { expect } from "chai";
import { ethers } } from "hardhat";

describe("demo mutant m4367cbc7 - revert removal", function () {
  it("should revert when external call fails in original but mutant returns true", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the demo contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple contract that does NOT implement transferFrom
    const BadContractFactory = await ethers.getContractFactory("BadContract");
    const badContract = await BadContractFactory.deploy();
    await badContract.waitForDeployment();
    
    // Prepare test parameters
    const from = addr1.address;
    const tos = [addr2.address];
    const value = ethers.parseEther("1");
    
    // The original contract should revert when calling a contract without transferFrom
    // The mutant (without revert) would return true instead
    await expect(
      instance.transfer(from, await badContract.getAddress(), tos, value)
    ).to.be.reverted;
  });
});

// Helper contract that doesn't implement transferFrom
contract BadContract {
  // Intentionally empty - no fallback or receive function
  // This will cause the external call to fail
}