import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant test for burn function (mcd141c11)", function () {
  it("should revert when non-owner tries to call burn on original contract but succeed on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund addr1 with some tokens first (owner distributes to addr1)
    await instance.connect(owner).distr(addr1.address, ethers.parseEther("100"));
    
    // addr1 attempts to burn tokens from their own balance (valid call)
    // On original: should revert because addr1 is not owner
    // On mutant: should succeed because onlyOwner modifier is removed
    await expect(
      instance.connect(addr1).burn(ethers.parseEther("10"))
    ).to.be.reverted; // This will pass on original, fail on mutant (mutant allows it)
  });
});