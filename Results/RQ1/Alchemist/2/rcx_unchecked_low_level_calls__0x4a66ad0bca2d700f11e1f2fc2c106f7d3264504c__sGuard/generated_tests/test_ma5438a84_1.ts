import { expect } from "chai";
import { ethers } } from "hardhat";

describe("EBU mutant test - kill ma5438a84", function () {
  it("should revert when loop bound is <= instead of < (out-of-bounds access)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare arrays with exactly one element
    const tos = [addr1.address];
    const values = [1]; // 1 token in wei units

    // The original contract loops i < tos.length (i=0 only)
    // The mutant loops i <= tos.length (i=0 and i=1)
    // When i=1, accessing tos[1] and v[1] causes out-of-bounds revert
    await expect(
      instance.connect(owner).transfer(tos, values)
    ).to.be.reverted;
  });
});