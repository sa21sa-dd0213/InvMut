import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m4ab33664", function () {
  it("should revert when calling transfer with a non-empty array due to mutant changing > to <", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tos = [owner.address];
    const values = [1];

    await expect(
      instance.connect(owner).transfer(tos, values)
    ).to.be.reverted;
  });
});