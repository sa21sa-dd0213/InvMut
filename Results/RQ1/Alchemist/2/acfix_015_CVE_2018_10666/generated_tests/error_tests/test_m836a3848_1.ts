import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Owned mutant test - m836a3848", function () {
  it("should revert when non-owner calls setOwner after modifier is broken", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy(); // constructor takes no arguments
    await instance.waitForDeployment();

    // The mutant removes the require from onlyOwner, so attacker can change owner
    // In original, this would revert; in mutant it succeeds
    // We expect revert for original, but mutant will pass - so we assert revert to kill mutant
    await expect(
      instance.connect(attacker).setOwner(attacker.address)
    ).to.be.revertedWith(""); // empty string since original require has no message
  });
});