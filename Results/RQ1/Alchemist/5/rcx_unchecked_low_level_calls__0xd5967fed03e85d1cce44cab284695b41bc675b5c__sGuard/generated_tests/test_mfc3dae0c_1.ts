import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant test", function () {
  it("should succeed with non-empty tos array but mutant reverts due to require(_tos.length < 0)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(_tos.length > 0) to require(_tos.length < 0)
    // With a non-empty array, the mutant will always revert.
    // The original should succeed.
    const tos = [addr1.address, addr2.address];
    const value = ethers.parseEther("1");

    await expect(
      instance.transfer(owner.address, addr1.address, tos, value)
    ).to.not.be.reverted;
  });
});