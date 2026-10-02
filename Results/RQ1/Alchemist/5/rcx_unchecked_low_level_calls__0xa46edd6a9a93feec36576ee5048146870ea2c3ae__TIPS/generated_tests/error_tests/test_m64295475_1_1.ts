import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant detection - m64295475", function () {
  it("should revert when _tos array is empty (original requires > 0, mutant allows >= 0)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create empty arrays for _tos and v
    const emptyAddresses: string[] = [];
    const emptyValues: bigint[] = [];

    // This call should revert on the original (require _tos.length > 0)
    // but succeed on the mutant (require _tos.length >= 0 allows empty array)
    await expect(
      instance.transfer(owner.address, owner.address, emptyAddresses, emptyValues)
    ).to.be.reverted;
  });
});