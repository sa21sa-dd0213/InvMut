import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant m26bf4123 - kill test", function () {
  it("should revert when non-owner calls owned() with onlyOwner modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The owned() function has onlyOwner modifier, so calling from non-owner should revert
    await expect(instance.connect(addr1).owned()).to.be.reverted;
  });
});