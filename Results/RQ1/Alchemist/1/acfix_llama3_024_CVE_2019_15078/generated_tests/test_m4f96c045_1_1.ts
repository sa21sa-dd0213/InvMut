import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m4f96c045 - distr function multiplication mutation", function () {
  it("should revert when calling getTokens() due to multiplication overflow in distr()", async function () {
    const [owner, investor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial state: totalDistributed should be 200,000,000 * 10^18
    const initialTotalDistributed = await instance.totalDistributed();
    expect(initialTotalDistributed).to.equal(ethers.parseEther("200000000"));

    // Ensure distribution is not finished
    expect(await instance.distributionFinished()).to.be.false;

    // Call getTokens() as a non-blacklisted investor
    // This will trigger distr() which in the mutant does totalDistributed * _amount
    // Starting value is 200000000e18 and _amount is 1000e18
    // Multiplication would cause massive overflow and revert
    await expect(
      instance.connect(investor).getTokens()
    ).to.be.reverted;

    // Verify that totalDistributed remained unchanged (no partial state update)
    const finalTotalDistributed = await instance.totalDistributed();
    expect(finalTotalDistributed).to.equal(ethers.parseEther("200000000"));
  });
});