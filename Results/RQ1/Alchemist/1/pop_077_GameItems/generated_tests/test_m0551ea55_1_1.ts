import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant m0551ea55 - transferOwnership", function () {
  it("should revert when non-owner tries to transfer ownership", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, addr1.address);
    await instance.waitForDeployment();

    // Verify current owner is the deployer
    const ownerBefore = await instance._ownerAddress();
    expect(ownerBefore).to.equal(owner.address);

    // Attempt to transfer ownership from an unauthorized address (addr2)
    await expect(
      instance.connect(addr2).transferOwnership(addr2.address)
    ).to.be.reverted;

    // Verify owner has not changed
    const ownerAfter = await instance._ownerAddress();
    expect(ownerAfter).to.equal(owner.address);
  });
});