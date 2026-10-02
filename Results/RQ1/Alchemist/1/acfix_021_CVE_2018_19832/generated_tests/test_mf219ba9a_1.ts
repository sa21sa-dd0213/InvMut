import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant mf219ba9a detection", function () {
  it("should kill mutant by performing two sequential distributions and verifying second succeeds", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First distribution: addr1 gets tokens via getTokens()
    await instance.connect(addr1).getTokens({ value: 0 });
    
    // Check totalRemaining after first distribution - in mutant it would be drastically reduced
    // For mutant: totalRemaining = 250000000e18 / 2500e18 = 100000
    // For original: totalRemaining = 250000000e18 - 2500e18 = 249997500e18
    
    // Second distribution should succeed on original but fail on mutant
    // because mutant's totalRemaining (100000) < value (2500e18)
    await expect(
      instance.connect(addr2).getTokens({ value: 0 })
    ).to.not.be.reverted;
  });
});