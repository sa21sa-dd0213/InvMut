import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID - kill mutant mba902ad2 (missing DistrFinished event)", function () {
  it("should emit DistrFinished event when finishDistribution is called, but mutant will not emit it", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call finishDistribution and capture the transaction
    const tx = await instance.finishDistribution();
    const receipt = await tx.wait();

    // Expect the DistrFinished event to be emitted
    await expect(tx).to.emit(instance, "DistrFinished");
  });
});