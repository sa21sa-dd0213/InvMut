import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m53c23e7e test", function () {
  it("should revert when _tos array is empty (kills mutant with >=)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const emptyAddresses: string[] = [];
    const value = ethers.parseEther("1");

    // Original requires _tos.length > 0, so empty array reverts.
    // Mutant with >= 0 would not revert, allowing the call to succeed silently.
    await expect(
      instance.transfer(owner.address, addr1.address, emptyAddresses, value)
    ).to.be.reverted;
  });
});