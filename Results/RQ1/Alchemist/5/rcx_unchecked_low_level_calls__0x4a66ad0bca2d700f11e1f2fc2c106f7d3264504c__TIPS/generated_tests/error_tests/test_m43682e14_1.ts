import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m43682e14 by calling transfer with a valid non-empty array (expects success on original, revert on mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tos = [addr1.address];
    const values = [1]; // 1 token

    // The original contract requires _tos.length > 0, which is satisfied.
    // The mutant requires _tos.length < 0, which is impossible (unsigned length never negative),
    // so the transaction should revert on the mutant but succeed on the original.
    await expect(
      instance.transfer(tos, values)
    ).to.not.be.reverted;
  });
});