import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - Kill mutant m5e0df859 (finishDistribution event emission)", function () {
  it("should emit DistrFinished event when finishDistribution is called", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The finishDistribution function is callable only by owner and only when distribution is not finished
    // We expect the DistrFinished event to be emitted
    await expect(instance.finishDistribution())
      .to.emit(instance, "DistrFinished");
  });
});