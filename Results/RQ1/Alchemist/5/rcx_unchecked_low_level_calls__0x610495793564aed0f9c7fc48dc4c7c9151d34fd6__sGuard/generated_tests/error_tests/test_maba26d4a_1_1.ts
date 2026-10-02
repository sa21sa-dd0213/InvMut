import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant kill test - maba26d4a", function () {
  it("should revert when non-owner calls withdrawAll without the require guard", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attacker tries to call withdrawAll - should revert in original, but mutant removes the require
    await expect(
      instance.connect(attacker).withdrawAll()
    ).to.be.revertedWith(""); // Empty string covers any revert reason; mutant will not revert
  });
});