import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - mea289c12", function () {
  it("should allow owner to setOwner and kill mutant that uses !=", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner calls setOwner - should succeed in original but fail in mutant
    // because mutant requires msg.sender != owner
    await expect(instance.connect(owner).setOwner(addr1.address)).to.not.be.reverted;
  });
});