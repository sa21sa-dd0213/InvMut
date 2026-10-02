import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner tries to call setOwner (mutant kills access control)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Try to call setOwner from a non-owner address - should revert in original, succeed in mutant
    await expect(
      instance.connect(addr1).setOwner(addr1.address)
    ).to.be.reverted;
  });
});