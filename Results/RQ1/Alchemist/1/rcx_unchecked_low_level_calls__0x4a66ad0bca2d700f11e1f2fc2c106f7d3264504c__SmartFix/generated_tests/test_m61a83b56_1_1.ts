import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m61a83b56 test", function () {
  it("should revert when calling transfer with v[i] = 2 due to exponentiation overflow in mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy EBU - no constructor arguments needed
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare test data
    const tos = [addr1.address];
    const values = [2]; // This value will cause overflow with ** but works with *

    // The original contract should pass, but the mutant should revert
    // due to arithmetic overflow when computing 2**1000000000000000000
    await expect(
      instance.connect(owner).transfer(tos, values)
    ).to.be.reverted;
  });
});