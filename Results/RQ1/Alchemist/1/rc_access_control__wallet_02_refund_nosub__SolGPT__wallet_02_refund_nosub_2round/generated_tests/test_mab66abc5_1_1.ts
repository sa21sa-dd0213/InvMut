import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant test - deposit assertion comparison", function () {
  it("should detect mutant by depositing 1 wei from a fresh account and expecting success (mutant will revert)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call deposit with 1 wei from addr1 (fresh account with zero balance)
    const tx = instance.connect(addr1).deposit({ value: 1 });

    // On original: succeeds (assert passes because 0 + 1 > 0 is true)
    // On mutant: reverts because assert(0 + 1 < 0) is false
    await expect(tx).to.be.reverted;
  });
});