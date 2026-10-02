import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m09bd76b1 test", function () {
  it("should revert on mutant when calling transfer with valid non-empty array, while original would succeed", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tos = ["0x0000000000000000000000000000000000000001"];
    const values = [1];

    // The original contract would succeed (require(_tos.length > 0) passes).
    // The mutant changes it to require(_tos.length < 0), which always fails
    // because length is uint and cannot be negative.
    await expect(instance.transfer(tos, values)).to.be.reverted;
  });
});