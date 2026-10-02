import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant m8f632866 - onlyOwner modifier removed", function () {
  it("should revert when non-owner tries to set owner (original has onlyOwner modifier)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // In the original contract, calling setOwner from a non-owner should revert
    // The mutant removes the onlyOwner modifier, so this would succeed in the mutant
    await expect(
      instance.connect(addr1).setOwner(addr1.address)
    ).to.be.reverted;
  });
});