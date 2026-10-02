import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant m5c8d595e test", function () {
  it("should detect mutant by testing require(value <= totalRemaining) logic", async function () {
    const [owner, investor] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial state: totalRemaining = 250000000e18, value = 2500e18
    // value is less than totalRemaining, so original require(value <= totalRemaining) passes
    // Mutant require(value >= totalRemaining) would revert because value < totalRemaining
    
    // Send ether to trigger getTokens() via receive() which calls getTokens()
    await expect(
      investor.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1")
      })
    ).to.be.reverted; // Mutant should revert, original should pass
  });
});