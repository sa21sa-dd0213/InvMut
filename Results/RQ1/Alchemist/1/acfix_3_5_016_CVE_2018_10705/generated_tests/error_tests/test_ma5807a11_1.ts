import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant ma5807a11 - onlyOwner modifier removal", function () {
  it("should revert when non-owner calls a function protected by onlyOwner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call setOwner from an address that is NOT the owner
    // The onlyOwner modifier should revert, but the mutant removes the require check
    await expect(
      instance.connect(addr1).setOwner(addr1.address)
    ).to.be.reverted;
  });
});