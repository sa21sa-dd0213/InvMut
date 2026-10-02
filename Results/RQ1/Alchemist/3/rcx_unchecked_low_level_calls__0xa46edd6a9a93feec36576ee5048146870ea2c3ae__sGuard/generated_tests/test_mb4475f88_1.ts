import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when array has one element due to out-of-bounds access in mutant", async function () {
    const [owner, from, to] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tos = [to.address];
    const values = [100];

    // The mutant changes i < _tos.length to i <= _tos.length
    // With one element, the loop will try to access _tos[1] which is out of bounds
    await expect(
      instance.transfer(from.address, to.address, tos, values)
    ).to.be.reverted;
  });
});