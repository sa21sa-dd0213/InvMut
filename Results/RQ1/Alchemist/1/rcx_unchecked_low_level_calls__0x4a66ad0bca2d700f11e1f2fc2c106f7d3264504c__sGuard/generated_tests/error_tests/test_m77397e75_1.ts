import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m77397e75", function () {
  it("should revert when called from unauthorized address (mutant removes access control)", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare test data
    const recipients = [attacker.address];
    const amounts = [1];

    // Attempt to call transfer from unauthorized address
    // Original contract would revert, mutant would not
    await expect(
      instance.connect(attacker).transfer(recipients, amounts)
    ).to.be.reverted;
  });
});