import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - kill mutant mcbca3856 (transferOwnership modifier removed)", function () {
  it("should revert when non-owner tries to call transferOwnership on original contract, but succeed on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify owner is the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Non-owner (addr1) attempts to transfer ownership to themselves
    // On the original contract this should revert due to onlyOwner modifier
    // On the mutant this would succeed (no modifier check)
    await expect(
      instance.connect(addr1).transferOwnership(addr1.address)
    ).to.be.revertedWith("");

    // Verify ownership was NOT transferred
    expect(await instance.owner()).to.equal(owner.address);
  });
});