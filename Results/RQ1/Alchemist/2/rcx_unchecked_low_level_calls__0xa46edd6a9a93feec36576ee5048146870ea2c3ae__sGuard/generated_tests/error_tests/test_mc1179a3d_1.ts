import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - mc1179a3d", function () {
  it("should revert when _tos array is empty (mutant removes require check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const caddress = addr1.address;
    const emptyTos: string[] = [];
    const emptyV: number[] = [];

    // The original contract reverts due to require(_tos.length > 0)
    // The mutant removes this check, so it should NOT revert
    await expect(
      instance.transfer(owner.address, caddress, emptyTos, emptyV)
    ).to.be.reverted;
  });
});