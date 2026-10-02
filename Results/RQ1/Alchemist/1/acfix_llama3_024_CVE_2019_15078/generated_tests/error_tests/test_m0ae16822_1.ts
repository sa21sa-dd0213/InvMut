import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant kill test - m0ae16822", function () {
  it("should revert when finishDistribution is called twice (canDistr modifier missing in mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call to finishDistribution should succeed
    await instance.connect(owner).finishDistribution();

    // Second call should revert because distributionFinished is already true
    // (original contract has canDistr modifier that enforces this; mutant removes it)
    await expect(
      instance.connect(owner).finishDistribution()
    ).to.be.revertedWith(""); // revert expected regardless of reason string
  });
});