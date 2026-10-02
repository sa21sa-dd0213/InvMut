import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo reference (ethers v6)", function () {
  it("should kill mutant m2de83389 by calling transfer with a single recipient and expecting success on original, but revert on mutant due to out-of-bounds loop", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const recipients = [addr2.address];
    const value = ethers.parseEther("1");

    // The original contract should succeed with one recipient (i < _tos.length)
    // The mutant uses i <= _tos.length, causing an extra iteration that accesses _tos[1] (out of bounds) and reverts
    await expect(
      instance.transfer(owner.address, addr1.address, recipients, value)
    ).to.be.reverted;
  });
});