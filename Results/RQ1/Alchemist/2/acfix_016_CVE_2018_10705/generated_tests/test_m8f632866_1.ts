import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner tries to setOwner (kill mutant m8f632866)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call setOwner from a non-owner address - should revert with onlyOwner modifier
    await expect(
      instance.connect(addr1).setOwner(addr1.address)
    ).to.be.revertedWith("");

    // Verify owner remains unchanged
    expect(await instance.owner()).to.equal(owner.address);
  });
});