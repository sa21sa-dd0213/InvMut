import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty in original, but pass in mutant (mutant mc1179a3d)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare empty arrays for _tos and v
    const emptyAddresses: string[] = [];
    const emptyValues: bigint[] = [];

    // The original contract requires _tos.length > 0, so this should revert
    await expect(
      instance.transfer(owner.address, addr1.address, emptyAddresses, emptyValues)
    ).to.be.reverted;
  });
});