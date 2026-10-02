import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m6f0393f4 - finishDistribution onlyOwner modifier", function () {
  it("should revert when non-owner calls finishDistribution on original, but should succeed on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Try to call finishDistribution from a non-owner address
    // On the original contract (with onlyOwner modifier), this should revert
    // On the mutant (without onlyOwner modifier), this should succeed
    await expect(
      instance.connect(addr1).finishDistribution()
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});