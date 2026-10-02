import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - kill m76898474", function () {
  it("should kill mutant by calling transferOwnership from owner and expecting success (mutant reverts instead)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner calls transferOwnership - should succeed in original, revert in mutant
    await expect(instance.transferOwnership(addr1.address)).to.not.be.reverted;
  });
});