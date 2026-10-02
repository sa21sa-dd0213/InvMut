import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant m76898474 test", function () {
  it("should kill mutant by having owner call onlyOwner function and expect success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify owner is set correctly
    expect(await instance.owner()).to.equal(owner.address);

    // Owner should be able to call transferOwnership (protected by onlyOwner)
    // The mutant reverses the check, so this will revert and kill the mutant
    await expect(
      instance.connect(owner).transferOwnership(addr1.address)
    ).to.not.be.reverted;

    // Verify ownership was transferred successfully
    expect(await instance.owner()).to.equal(addr1.address);
  });
});