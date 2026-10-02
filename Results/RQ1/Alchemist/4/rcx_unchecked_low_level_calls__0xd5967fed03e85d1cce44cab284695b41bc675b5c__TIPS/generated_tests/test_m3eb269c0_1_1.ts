import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m3eb269c0 test", function () {
  it("should revert when _tos array is empty (mutant removes the require check)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant removes the require(_tos.length > 0) check,
    // so calling with an empty _tos array should NOT revert in the mutant,
    // but SHOULD revert in the original. We expect revert to kill the mutant.
    await expect(
      instance.transfer(owner.address, addr1.address, [], ethers.parseEther("1"))
    ).to.be.reverted;
  });
});