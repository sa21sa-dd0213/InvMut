import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner tries to setOwner (kill mutant m8f632866)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify that owner can call setOwner successfully
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();
    expect(await instance.owner()).to.equal(addr1.address);

    // Now try from non-owner (addr1 is now owner, so use a third signer)
    const [, , nonOwner] = await ethers.getSigners();
    await expect(
      instance.connect(nonOwner).setOwner(owner.address)
    ).to.be.reverted;
  });
});