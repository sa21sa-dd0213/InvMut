import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant kill test - empty tos array", function () {
  it("should revert when _tos array is empty on the original contract", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const from = owner.address;
    const caddress = owner.address;
    const emptyTos: string[] = [];
    const v: number[] = [];

    await expect(
      instance.transfer(from, caddress, emptyTos, v)
    ).to.be.reverted;
  });
});