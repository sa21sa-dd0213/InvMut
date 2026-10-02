import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleSuicide mutant kill test - m19784831", function () {
  it("should revert when non-owner tries to call sudicideAnyone on original, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleSuicide");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call sudicideAnyone from a non-owner address
    // In the original contract, this should revert due to __onlyOwner modifier
    // In the mutant, it will execute selfdestruct and not revert
    const tx = instance.connect(addr1).sudicideAnyone();
    
    // The test expects a revert - this will pass on original, fail on mutant
    await expect(tx).to.be.reverted;
  });
});