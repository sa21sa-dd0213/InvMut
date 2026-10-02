import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia reference (ethers v6)", function () {
  it("should kill mutant m0057bc17 by verifying totalDistributed after burn with _value != 1", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial totalDistributed (should be 250000000e18)
    const initialTotalDistributed = await instance.totalDistributed();
    const burnAmount = ethers.parseEther("1000"); // 1000 tokens, not equal to 1

    // Perform burn
    const tx = await instance.connect(owner).burn(burnAmount);
    await tx.wait();

    // Get new totalDistributed
    const newTotalDistributed = await instance.totalDistributed();

    // In original: totalDistributed = totalDistributed - burnAmount
    // In mutant: totalDistributed = totalDistributed / burnAmount
    // For original, newTotalDistributed should equal initialTotalDistributed - burnAmount
    const expectedOriginal = initialTotalDistributed - burnAmount;

    // For mutant with burnAmount = 1000e18, result would be 250000000e18 / 1000e18 = 250000
    // So if newTotalDistributed equals expectedOriginal, original passes, mutant fails
    expect(newTotalDistributed).to.equal(expectedOriginal);
  });
});