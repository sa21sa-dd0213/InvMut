import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant m50ad35c6 test", function () {
  it("should succeed when value < totalRemaining (original behavior) but mutant reverts due to == check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial state: value = 2500e18, totalRemaining = 250000000e18
    // value is much less than totalRemaining, so original require(value <= totalRemaining) passes
    // Mutant require(value == totalRemaining) would fail because 2500e18 != 250000000e18

    // Ensure addr1 is not blacklisted
    expect(await instance.blacklist(addr1.address)).to.be.false;

    // Call getTokens() from addr1 - should succeed on original, revert on mutant
    const tx = instance.connect(addr1).getTokens();
    await expect(tx).to.not.be.reverted; // This assertion will fail on the mutant, killing it
  });
});