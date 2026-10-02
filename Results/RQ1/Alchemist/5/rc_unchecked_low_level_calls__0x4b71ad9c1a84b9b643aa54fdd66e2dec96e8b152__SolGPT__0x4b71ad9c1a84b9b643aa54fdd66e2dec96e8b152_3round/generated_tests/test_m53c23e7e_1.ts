import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant detection - m53c23e7e", function () {
  it("should revert when transfer is called with an empty _tos array (kills mutant where require(_tos.length >= 0) is always true)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original requires _tos.length > 0, so an empty array should revert.
    // The mutant changes to >= 0 which is always true, so it would NOT revert.
    await expect(
      instance.transfer(
        owner.address,
        owner.address, // caddress - any valid address
        [], // empty _tos array
        1 // v - any value
      )
    ).to.be.reverted;
  });
});