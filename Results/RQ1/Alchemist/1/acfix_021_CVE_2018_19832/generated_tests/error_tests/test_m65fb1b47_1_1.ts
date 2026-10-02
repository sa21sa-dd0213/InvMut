import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant test - m65fb1b47", function () {
  it("should detect balance subtraction bug in distr function", async function () {
    const [owner, investor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Ensure distribution is not finished
    expect(await instance.distributionFinished()).to.equal(false);

    // Get investor's balance before calling getTokens
    const balanceBefore = await instance.balanceOf(investor.address);

    // Investor calls getTokens() - should increase balance in original, decrease in mutant
    await instance.connect(investor).getTokens();

    // Get investor's balance after calling getTokens
    const balanceAfter = await instance.balanceOf(investor.address);

    // In original: balance increases (balanceAfter > balanceBefore)
    // In mutant: balance decreases (balanceAfter < balanceBefore)
    // This assertion will pass on original but fail on mutant, killing it
    expect(balanceAfter).to.be.gt(balanceBefore);
  });
});