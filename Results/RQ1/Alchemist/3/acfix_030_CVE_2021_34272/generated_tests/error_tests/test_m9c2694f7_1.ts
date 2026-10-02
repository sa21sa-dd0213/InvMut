import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - m9c2694f7", function () {
  it("should revert when non-owner calls transferOwnership", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 (non-owner) tries to transfer ownership - should revert in original, succeed in mutant
    await expect(
      instance.connect(addr1).transferOwnership(addr1.address)
    ).to.be.reverted;
  });
});