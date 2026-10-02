import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner tries to transfer ownership (detect missing require in onlyOwner modifier)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify that owner is initially the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Attempt to transfer ownership from a non-owner address - should revert
    await expect(
      instance.connect(addr1).transferOwnership(addr2.address)
    ).to.be.reverted;

    // Verify owner remains unchanged
    expect(await instance.owner()).to.equal(owner.address);
  });
});