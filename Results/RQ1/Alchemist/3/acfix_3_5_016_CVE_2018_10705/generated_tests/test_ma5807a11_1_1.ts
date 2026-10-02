import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant ma5807a11 test", function () {
  it("should revert when non-owner calls a function with onlyOwner modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 is not the owner, so calling setOwner should revert due to onlyOwner modifier
    await expect(
      instance.connect(addr1).setOwner(addr1.address)
    ).to.be.revertedWith("Only admin can call address(this) function");
  });
});