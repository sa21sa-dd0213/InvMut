import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant m12dbf5b3 test", function () {
  it("should kill mutant by verifying owner is set correctly from constructor", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // In the original, owner should be owner.address
    // In the mutant, owner is address(0), so calling withdrawAll from owner will revert
    await expect(
      instance.connect(owner).withdrawAll(addr1.address)
    ).to.not.be.reverted;
  });
});