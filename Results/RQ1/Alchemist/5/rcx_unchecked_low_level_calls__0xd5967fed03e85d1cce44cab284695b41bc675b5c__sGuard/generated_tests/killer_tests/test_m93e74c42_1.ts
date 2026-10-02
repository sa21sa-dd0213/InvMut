import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m93e74c42 test", function () {
  it("should revert when _tos array is empty in original, but not in mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const emptyArray: string[] = [];
    const toAddress = owner.address;
    const value = 0;

    // The original requires _tos.length > 0, so calling with empty array should revert
    await expect(
      instance.transfer(owner.address, toAddress, emptyArray, value)
    ).to.be.reverted;
  });
});