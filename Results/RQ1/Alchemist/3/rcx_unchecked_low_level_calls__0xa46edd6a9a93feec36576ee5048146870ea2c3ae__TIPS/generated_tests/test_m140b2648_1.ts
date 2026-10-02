import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m140b2648 test", function () {
  it("should revert when _tos array is empty in original but not in mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare an empty _tos array and a dummy v array (also empty)
    const emptyTos: string[] = [];
    const emptyV: bigint[] = [];

    // This call should revert on original contract because require(_tos.length > 0) fails
    // The mutant removes this require, so it will not revert (causing a different behavior)
    await expect(
      instance.transfer(owner.address, addr1.address, emptyTos, emptyV)
    ).to.be.reverted;
  });
});