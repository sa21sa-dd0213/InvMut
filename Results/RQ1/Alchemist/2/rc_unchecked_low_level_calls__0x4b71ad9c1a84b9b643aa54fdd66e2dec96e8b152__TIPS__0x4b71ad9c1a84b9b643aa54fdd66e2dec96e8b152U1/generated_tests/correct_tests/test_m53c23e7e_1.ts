import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6)", function () {
  it("should revert when _tos array is empty (original behavior) - kills mutant with >= 0", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const emptyArray: string[] = [];
    const v = ethers.parseEther("1");

    // The original contract requires _tos.length > 0, so empty array should revert.
    // The mutant replaces > with >=, making the require always true, so it would not revert.
    await expect(
      instance.transfer(owner.address, addr1.address, emptyArray, v)
    ).to.be.reverted;
  });
});