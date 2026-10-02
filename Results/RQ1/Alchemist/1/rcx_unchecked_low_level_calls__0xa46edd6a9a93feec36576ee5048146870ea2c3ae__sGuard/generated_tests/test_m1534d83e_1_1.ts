import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test", function () {
  it("should revert for non-empty tos array when require condition is mutated to < 0", async function () {
    const [owner, from, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create non-empty arrays to pass to transfer function
    const tos = [addr1.address];
    const values = [ethers.parseEther("1")];

    // The original contract would succeed with tos.length > 0
    // The mutant has require(_tos.length < 0) which always fails since length >= 0
    // So we expect a revert when calling the mutated function
    await expect(
      instance.transfer(from.address, addr1.address, tos, values)
    ).to.be.reverted;
  });
});