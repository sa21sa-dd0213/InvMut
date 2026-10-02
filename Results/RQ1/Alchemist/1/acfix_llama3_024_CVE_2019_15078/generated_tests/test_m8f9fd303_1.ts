import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m8f9fd303 test", function () {
  it("should revert when calling getTokens after distribution is finished (kills mutant that removes canDistr modifier)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, finish the distribution to set distributionFinished = true
    await (await instance.connect(owner).finishDistribution()).wait();

    // Now attempt to call getTokens from a non-blacklisted address (addr1)
    // In the original contract, this should revert due to canDistr modifier on distr
    // In the mutant (missing canDistr modifier), it would succeed, killing the test
    await expect(
      instance.connect(addr1).getTokens()
    ).to.be.reverted;
  });
});