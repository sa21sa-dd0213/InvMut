import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant m0662053a", function () {
  it("should revert when calling finishDistribution() a second time (detects removal of canDistr modifier)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call should succeed
    const tx1 = await instance.connect(owner).finishDistribution();
    await tx1.wait();

    // Second call should revert because distribution is already finished
    // Original contract: canDistr modifier prevents second call
    // Mutant: no canDistr modifier, so second call would succeed (killing the mutant)
    await expect(
      instance.connect(owner).finishDistribution()
    ).to.be.reverted;
  });
});