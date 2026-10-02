import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant mda61a145 test", function () {
  it("should revert when _tos length is valid (1) due to mutant changing > to <", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tos = [addr2.address];
    const value = ethers.parseEther("1");

    // The original requires _tos.length > 0, which passes with 1 element.
    // The mutant requires _tos.length < 0, which always fails because length is unsigned and >= 0.
    await expect(
      instance.transfer(owner.address, addr1.address, tos, value)
    ).to.be.reverted;
  });
});