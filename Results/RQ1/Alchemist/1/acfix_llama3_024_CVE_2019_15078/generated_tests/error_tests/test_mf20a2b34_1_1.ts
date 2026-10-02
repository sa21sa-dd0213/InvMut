import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID - Kill mutant mf20a2b34 (totalRemaining += instead of -=)", function () {
  it("should kill the mutant by verifying totalRemaining decreases after distribution", async function () {
    const [owner, investor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial totalRemaining
    const initialTotalRemaining = await instance.totalRemaining();

    // Perform a distribution by calling getTokens() (which calls distr internally)
    // First ensure distribution is not finished and investor is not blacklisted
    await instance.connect(investor).getTokens({ value: ethers.parseEther("1") });

    // Get totalRemaining after distribution
    const finalTotalRemaining = await instance.totalRemaining();

    // In the original contract, totalRemaining should decrease
    // In the mutant, totalRemaining would increase (because + instead of -)
    // So asserting that totalRemaining decreased kills the mutant
    expect(finalTotalRemaining).to.be.lessThan(initialTotalRemaining);
  });
});