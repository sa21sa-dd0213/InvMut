import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant mda61a145 test", function () {
  it("should revert when calling transfer with a non-empty array because mutant requires length < 0", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const recipients = [addr2.address];
    const value = ethers.parseEther("1");

    // The original contract would succeed with a non-empty array.
    // The mutant changes require(_tos.length > 0) to require(_tos.length < 0),
    // which always reverts because array length cannot be negative.
    await expect(
      instance.transfer(owner.address, addr1.address, recipients, value)
    ).to.be.reverted;
  });
});