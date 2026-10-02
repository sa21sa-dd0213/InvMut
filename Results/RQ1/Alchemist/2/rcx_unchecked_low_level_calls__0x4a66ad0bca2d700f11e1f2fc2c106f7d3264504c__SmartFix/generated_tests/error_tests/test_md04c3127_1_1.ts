import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (original behavior) - kills mutant md04c3127", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract has no constructor arguments
    const emptyTos: string[] = [];
    const emptyV: number[] = [];

    // Original requires _tos.length > 0, mutant requires _tos.length >= 0 (always true)
    // Passing empty array should revert in original, succeed in mutant
    await expect(
      instance.transfer(emptyTos, emptyV)
    ).to.be.reverted;
  });
});