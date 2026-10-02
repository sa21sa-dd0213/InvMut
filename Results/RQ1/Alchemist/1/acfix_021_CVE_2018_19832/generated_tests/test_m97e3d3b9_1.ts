import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant m97e3d3b9 - canDistr modifier removal", function () {
  it("should revert getTokens after distribution is finished (kills mutant that removed canDistr)", async function () {
    const [owner, investor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Finish the distribution first
    await instance.connect(owner).finishDistribution();

    // Attempt to call getTokens after distribution is finished - should revert
    await expect(
      instance.connect(investor).getTokens()
    ).to.be.reverted;
  });
});