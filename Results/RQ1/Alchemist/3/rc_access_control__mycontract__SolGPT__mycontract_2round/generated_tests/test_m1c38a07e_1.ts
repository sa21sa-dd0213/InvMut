import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6)", function () {
  it("should kill mutant m1c38a07e: require(amount > 0) replaced with require(amount < 0)", async function () {
    const [owner, receiver] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant requires amount < 0, so a positive amount (e.g., 1 wei) should revert
    // In the original, a positive amount should succeed
    await expect(
      instance.connect(owner).sendTo(receiver.address, 1)
    ).to.be.reverted;
  });
});