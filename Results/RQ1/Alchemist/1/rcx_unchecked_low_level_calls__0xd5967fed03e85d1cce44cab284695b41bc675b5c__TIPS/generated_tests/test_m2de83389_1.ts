import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant kill test - m2de83389", function () {
  it("should revert when _tos array has one element due to out-of-bounds access in mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tos = [addr2.address];
    const v = 100;

    // On original: loops i < 1, processes index 0, returns true
    // On mutant: loops i <= 1, processes index 0 and then tries index 1 (out of bounds) => revert
    await expect(
      instance.transfer(owner.address, addr1.address, tos, v)
    ).to.be.reverted;
  });
});