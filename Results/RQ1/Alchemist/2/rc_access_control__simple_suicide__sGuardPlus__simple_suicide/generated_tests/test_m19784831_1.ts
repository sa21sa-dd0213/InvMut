import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleSuicide mutant m19784831 test", function () {
  it("should revert when non-owner calls sudicideAnyone on original, but mutant allows it", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("SimpleSuicide");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Attempt to call sudicideAnyone from non-owner address
    // Original contract should revert due to __onlyOwner modifier
    // Mutant would allow this call to succeed (selfdestruct)
    await expect(
      instance.connect(nonOwner).sudicideAnyone()
    ).to.be.reverted;
  });
});