import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo reference (ethers v6)", function () {
  it("should kill mutant mda61a145 by passing a valid _tos array and expecting success on original, but the mutant reverts", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Test case: provide a _tos array with one element (length > 0)
    // Original contract: require(_tos.length > 0) passes
    // Mutant: require(_tos.length < 0) fails because length is never negative
    const tos = [addr2.address];
    const value = ethers.parseEther("1");

    // This call should revert on the mutant, but pass on the original
    await expect(
      instance.transfer(owner.address, addr1.address, tos, value)
    ).to.not.be.reverted;
  });
});