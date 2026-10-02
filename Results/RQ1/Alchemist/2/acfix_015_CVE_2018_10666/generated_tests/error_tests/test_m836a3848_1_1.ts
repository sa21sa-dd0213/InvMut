import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - m836a3848", function () {
  it("should revert when non-owner calls setOwner after modifier is broken", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    await expect(
      instance.connect(attacker).setOwner(attacker.address)
    ).to.be.revertedWith("");
  });
});