import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant kill test mc00f91a2", function () {
  it("should revert when calling transfer with empty _tos array", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare an empty array of addresses
    const emptyAddresses: string[] = [];

    // Expect revert when _tos.length is 0 (original contract requires > 0)
    await expect(
      instance.transfer(owner.address, addr1.address, emptyAddresses, 100)
    ).to.be.reverted;
  });
});