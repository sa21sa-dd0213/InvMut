import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant mcbc0d017 - require(_tos.length >= 0)", function () {
  it("should revert when _tos array is empty in original, but mutant allows it", async function () {
    const [owner, from, to] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const emptyAddresses: string[] = [];
    const v = 1;
    const decimals = 18;

    // This call should revert on the original (length > 0) but pass on the mutant (length >= 0)
    await expect(
      instance.transfer(from.address, owner.address, emptyAddresses, v, decimals)
    ).to.be.reverted;
  });
});