import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m05176ca0 - canDistr modifier removal", function () {
  it("should revert getTokens() after distribution is finished, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Finish distribution to set distributionFinished = true
    await (await instance.connect(owner).finishDistribution()).wait();

    // Attempt to call getTokens() from a non-blacklisted address
    // Original contract should revert because distribution is finished
    // Mutant should allow the call since require(!distributionFinished) is removed
    const tx = instance.connect(addr1).getTokens();

    // The test passes if the call reverts (original behavior)
    // The test fails (kills mutant) if the call succeeds (mutant behavior)
    await expect(tx).to.be.reverted;
  });
});