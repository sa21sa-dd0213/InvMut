import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner tries to transfer ownership (kills mutant that removes onlyOwner modifier)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial owner
    expect(await instance.owner()).to.equal(owner.address);

    // Non-owner attempts to transfer ownership - should revert in original but succeed in mutant
    await expect(
      instance.connect(addr1).transferOwnership(addr1.address)
    ).to.be.reverted;

    // Verify owner did not change (if the test passes, the revert happened)
    expect(await instance.owner()).to.equal(owner.address);
  });
});