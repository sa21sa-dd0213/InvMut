import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - kill m836a3848", function () {
  it("should revert when non-owner calls setOwner after modifier is removed", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 is not the owner, so calling setOwner should revert
    // In the mutant, the require is removed, so it will succeed instead
    await expect(
      instance.connect(addr1).setOwner(addr1.address)
    ).to.be.reverted;
  });
});