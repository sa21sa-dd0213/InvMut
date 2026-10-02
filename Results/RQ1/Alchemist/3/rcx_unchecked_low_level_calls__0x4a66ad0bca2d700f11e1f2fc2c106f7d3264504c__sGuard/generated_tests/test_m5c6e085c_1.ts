import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m5c6e085c by calling transfer with empty _tos array", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original contract requires _tos.length > 0, so empty array should revert.
    // The mutant changes to >= 0, which always passes for empty array.
    await expect(
      instance.transfer([], [])
    ).to.be.reverted;
  });
});