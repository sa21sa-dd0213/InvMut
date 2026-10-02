import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (kills mutant m53c23e7e)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(_tos.length > 0) to require(_tos.length >= 0)
    // Original reverts on empty array, mutant does not revert
    // Therefore a test expecting revert on empty array will pass on original but fail on mutant
    await expect(
      instance.transfer(owner.address, addr1.address, [], 100)
    ).to.be.reverted;
  });
});