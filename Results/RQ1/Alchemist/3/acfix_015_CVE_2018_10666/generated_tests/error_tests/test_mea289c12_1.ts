import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - mea289c12", function () {
  it("should revert when owner calls setOwner due to inverted modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes require(msg.sender == owner) to require(msg.sender != owner)
    // Owner calling setOwner should revert in mutant, but succeed in original
    await expect(
      instance.connect(owner).setOwner(addr1.address)
    ).to.be.reverted;
  });
});