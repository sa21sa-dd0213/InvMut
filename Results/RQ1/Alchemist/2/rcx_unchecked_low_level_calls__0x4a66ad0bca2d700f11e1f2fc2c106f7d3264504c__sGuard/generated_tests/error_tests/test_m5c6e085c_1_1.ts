import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test - m5c6e085c", function () {
  it("should revert when _tos array is empty (length 0) in original, but pass on mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Empty arrays to pass to transfer
    const emptyAddresses: string[] = [];
    const emptyValues: bigint[] = [];

    // Original contract should revert because require(_tos.length > 0) fails
    // Mutant with require(_tos.length >= 0) would not revert
    await expect(
      instance.connect(owner).transfer(emptyAddresses, emptyValues)
    ).to.be.reverted;
  });
});