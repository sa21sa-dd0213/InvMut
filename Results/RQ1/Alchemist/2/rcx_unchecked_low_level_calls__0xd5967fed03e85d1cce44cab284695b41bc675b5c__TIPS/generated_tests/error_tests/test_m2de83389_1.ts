import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant test - m2de83389", function () {
  it("should revert when _tos array has elements and loop uses <= instead of <", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // This call should succeed on the original but fail on the mutant
    // because the mutant loop will attempt to access _tos[_tos.length] which is out of bounds
    const tos = [addr1.address]; // array with exactly one element
    const value = ethers.parseEther("1.0");

    // On the original, this would succeed; on the mutant it reverts due to out-of-bounds access
    await expect(
      instance.transfer(owner.address, addr2.address, tos, value)
    ).to.be.reverted;
  });
});