import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - m1b16d27a", function () {
  it("should kill mutant by calling setOwner from owner address and expecting revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // In the original contract, owner can call setOwner successfully.
    // In the mutant, onlyOwner modifier uses != instead of ==, so owner is rejected.
    await expect(
      instance.connect(owner).setOwner(addr1.address)
    ).to.be.reverted;
  });
});