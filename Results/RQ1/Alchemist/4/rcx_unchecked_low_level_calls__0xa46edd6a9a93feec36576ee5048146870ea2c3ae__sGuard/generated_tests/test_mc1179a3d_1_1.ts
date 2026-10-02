import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant kill test mc1179a3d", function () {
  it("should revert when calling transfer with empty _tos array (original has require, mutant does not)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Test with empty arrays - original contract should revert, mutant will not
    await expect(
      instance.transfer(
        owner.address,
        addr1.address,
        [],
        []
      )
    ).to.be.reverted;
  });
});