import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant md6a16191 test", function () {
  it("should revert when _tos array is empty (kills mutant that removed require)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const emptyAddresses: string[] = [];
    const value = 100;
    const decimals = 18;

    // This call should revert in the original due to require(_tos.length > 0),
    // but the mutant removed that require, so it will not revert here.
    // We expect revert to detect the mutant (if it doesn't revert, mutant is alive)
    await expect(
      instance.transfer(owner.address, addr1.address, emptyAddresses, value, decimals)
    ).to.be.reverted;
  });
});