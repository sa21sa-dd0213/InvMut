import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant mab66abc5 - deposit assertion", function () {
  it("should kill mutant by calling deposit with positive value and expecting success", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Act: deposit 1 wei from owner address
    const tx = await instance.connect(owner).deposit({ value: 1 });

    // Assert: transaction should succeed (mutant will revert because < condition fails)
    await expect(tx).to.not.be.reverted;
  });
});