import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant kill test - m447c62cf", function () {
  it("should detect off-by-one error when _tos array has one element", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes i < _tos.length to i <= _tos.length
    // With a single-element array, original loops once (i=0)
    // Mutant loops twice (i=0 and i=1), causing out-of-bounds access on _tos[1]
    const tos = [addr2.address]; // Only one recipient
    const value = ethers.parseEther("1.0");

    // The original contract should succeed without revert
    // The mutant should revert due to accessing _tos[1] (undefined)
    await expect(
      instance.transfer(owner.address, addr1.address, tos, value)
    ).to.be.reverted;
  });
});