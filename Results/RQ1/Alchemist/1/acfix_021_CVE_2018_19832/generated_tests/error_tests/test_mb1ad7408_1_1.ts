import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant mb1ad7408 - blacklist test", function () {
  it("should blacklist investor after getTokens call, mutant fails because blacklist is never set", async function () {
    const [owner, investor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Ensure distribution is not finished
    expect(await instance.distributionFinished()).to.equal(false);

    // Investor calls getTokens() to receive tokens
    const tx = await instance.connect(investor).getTokens();
    await tx.wait();

    // Check that investor was blacklisted (original contract sets blacklist[investor] = true)
    const isBlacklisted = await instance.blacklist(investor.address);
    expect(isBlacklisted).to.equal(true);
  });
});