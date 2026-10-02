import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant kill test - m3eb269c0", function () {
  it("should revert when calling transfer with empty _tos array on original, but not on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Test with empty _tos array
    const emptyTos: string[] = [];
    const v = ethers.parseEther("1");

    // The original contract should revert due to require(_tos.length > 0)
    // If the mutant is deployed (without the require), this will not revert
    await expect(
      instance.transfer(owner.address, addr1.address, emptyTos, v)
    ).to.be.reverted;
  });
});