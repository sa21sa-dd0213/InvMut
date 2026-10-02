import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m44692e9d test", function () {
  it("should revert when calling transfer with non-empty _tos array on mutant (where require(_tos.length < 0) always fails)", async function () {
    const [owner, from, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tos = [addr1.address];
    const value = ethers.parseEther("1");

    // The mutant changes require(_tos.length > 0) to require(_tos.length < 0)
    // Since _tos.length is 1, the condition 1 < 0 is false, causing revert
    await expect(
      instance.transfer(from.address, owner.address, tos, value)
    ).to.be.reverted;
  });
});