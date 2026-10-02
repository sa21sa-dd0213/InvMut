import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant m61227de2 (getTokens: > replaced with <)", function () {
  it("should kill the mutant by verifying value distribution when value < totalRemaining", async function () {
    const [owner, investor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    // The contract has no constructor arguments
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Check initial state: totalRemaining = totalSupply - totalDistributed = 500M - 250M = 250M ether
    const totalRemaining = await instance.totalRemaining();
    const value = await instance.value();
    // value = 2500e18, totalRemaining = 250e6 ether => value < totalRemaining initially
    expect(value).to.be.lt(totalRemaining);

    // Ensure distribution is not finished
    expect(await instance.distributionFinished()).to.be.false;

    // Ensure investor is not blacklisted yet
    expect(await instance.blacklist(investor.address)).to.be.false;

    // Get the balance before
    const balanceBefore = await instance.balanceOf(investor.address);

    // Call getTokens() as the investor
    const tx = await instance.connect(investor).getTokens();
    await tx.wait();

    const balanceAfter = await instance.balanceOf(investor.address);
    const tokensReceived = balanceAfter - balanceBefore;

    // In the ORIGINAL: value stays at 2500e18, investor receives exactly 2500e18
    // In the MUTANT: value gets set to totalRemaining (~250M ether), investor receives that huge amount
    // So expecting the small value (2500e18) will kill the mutant
    expect(tokensReceived).to.equal(ethers.parseEther("2500"));
  });
});