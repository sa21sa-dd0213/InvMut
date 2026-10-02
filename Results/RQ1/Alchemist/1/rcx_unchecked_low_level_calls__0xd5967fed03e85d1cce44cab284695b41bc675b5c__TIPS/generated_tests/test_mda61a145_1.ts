import { expect } from "chai";
import { ethers } } from "hardhat";

describe("demo mutant test - mda61a145", function () {
  it("should revert when _tos array is empty (length = 0)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const emptyAddresses: string[] = [];
    const value = ethers.parseEther("1");

    // The original contract requires _tos.length > 0, so empty array should revert.
    // The mutant changes to _tos.length < 0, which is never true, so it would NOT revert.
    await expect(
      instance.transfer(owner.address, addr1.address, emptyAddresses, value)
    ).to.be.reverted;
  });
});