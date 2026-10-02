import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant kill test - seedMarket", function () {
  it("should kill the mutant by calling seedMarket for the first time and expecting it to succeed", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially marketDrugs should be 0
    expect(await instance.marketDrugs()).to.equal(0);

    // Call seedMarket with some drug amount - should succeed in original, revert in mutant
    const seedAmount = 100;
    await expect(
      instance.seedMarket(seedAmount)
    ).to.not.be.reverted;

    // Verify marketDrugs is now set
    expect(await instance.marketDrugs()).to.equal(seedAmount);
  });
});