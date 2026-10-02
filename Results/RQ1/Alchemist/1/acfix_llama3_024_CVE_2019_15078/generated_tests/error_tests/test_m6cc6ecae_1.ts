import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m6cc6ecae test", function () {
  it("should revert getTokens() after distribution is finished when canDistr modifier is present", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, finish the distribution
    await instance.connect(owner).finishDistribution();

    // Now attempt to call getTokens() from addr1 - should revert due to canDistr modifier
    // The mutant without canDistr would allow this call to succeed
    await expect(
      instance.connect(addr1).getTokens({ value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});