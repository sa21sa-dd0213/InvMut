import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant kill test - onlyOwner modifier removed", function () {
  it("should revert when non-owner calls setOwner due to onlyOwner modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call setOwner from a non-owner address - should revert in original, succeed in mutant
    await expect(
      instance.connect(addr1).setOwner(addr1.address)
    ).to.be.reverted;
  });
});