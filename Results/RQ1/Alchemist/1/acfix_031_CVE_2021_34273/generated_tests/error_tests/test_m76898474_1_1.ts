import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant test - m76898474", function () {
  it("should revert when owner calls transferOwnership (mutant incorrectly blocks owner)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    // The Owned contract has no constructor arguments in its original form
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially owner should be the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // In the original contract, owner can call transferOwnership successfully
    // In the mutant (require(msg.sender != owner)), owner's call will revert
    await expect(
      instance.connect(owner).transferOwnership(addr1.address)
    ).to.be.reverted;

    // Also verify owner was NOT changed (as the mutation would prevent it)
    expect(await instance.owner()).to.equal(owner.address);
  });
});