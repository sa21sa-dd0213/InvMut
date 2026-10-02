import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner tries to setOwner (detect mutant that removes onlyOwner modifier)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call setOwner from a non-owner address - should revert on original, pass on mutant
    await expect(
      instance.connect(addr1).setOwner(addr1.address)
    ).to.be.reverted;

    // Verify owner hasn't changed on original (mutant would have changed it)
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(owner.address);
  });
});