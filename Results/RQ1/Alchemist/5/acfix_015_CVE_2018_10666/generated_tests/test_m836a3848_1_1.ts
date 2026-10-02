import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant kill test", function () {
  it("should revert when non-owner tries to call setOwner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call setOwner from non-owner address - should revert in original
    await expect(
      instance.connect(addr1).setOwner(addr1.address)
    ).to.be.reverted;
  });
});