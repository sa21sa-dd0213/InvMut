import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant m1558b1c8 - onlyAdmin modifier", function () {
  it("should kill the mutant by calling setOwner from admin and expecting success", async function () {
    const [admin, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Admin calls setOwner - should succeed on original, fail on mutant
    const tx = instance.connect(admin).setOwner(addr1.address);
    await expect(tx).to.not.be.reverted;
  });
});