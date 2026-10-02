import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleSuicide mutant detection - m19784831", function () {
  it("should revert when non-owner calls sudicideAnyone", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleSuicide");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call sudicideAnyone from a non-owner address
    // The original contract should revert because of the __onlyOwner modifier
    // The mutant (without the modifier) will allow the call and selfdestruct
    await expect(
      instance.connect(addr1).sudicideAnyone()
    ).to.be.revertedWith(""); // revert for any reason (original) or succeed (mutant)
  });
});