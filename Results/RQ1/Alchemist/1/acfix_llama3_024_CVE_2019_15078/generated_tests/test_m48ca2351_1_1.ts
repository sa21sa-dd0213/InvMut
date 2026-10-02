import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m48ca2351 - transferOwnership to zero address", function () {
  it("should revert when transferring ownership to address(0) in original, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the current owner before the transfer attempt
    const originalOwner = await instance.owner();

    // Attempt to transfer ownership to the zero address
    // In the original contract, this should NOT change the owner because of the check newOwner != address(0)
    // In the mutant, it WILL change the owner to address(0) because the condition is replaced with true
    await instance.connect(owner).transferOwnership(ethers.ZeroAddress);

    // Check the owner after the transfer attempt
    const newOwner = await instance.owner();

    // If the mutant is present, the owner will be address(0)
    // If the original contract is used, the owner remains unchanged
    // We expect the original behavior (owner unchanged), so the test fails on the mutant
    expect(newOwner).to.equal(originalOwner);
  });
});