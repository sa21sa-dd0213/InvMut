import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant detection - mbe006077", function () {
  it("should revert when seedMarket is called a second time (original behavior), but mutant allows re-initialization", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Seed the market for the first time with some drugs
    const initialDrugs = 1000;
    await instance.seedMarket(initialDrugs);
    
    // Verify marketDrugs is set correctly after first seed
    expect(await instance.marketDrugs()).to.equal(initialDrugs);

    // Attempt to seed the market again - original contract should revert, mutant should succeed
    // We'll catch the revert and check if it reverts (original) or not (mutant)
    const secondDrugs = 2000;
    
    try {
      await instance.seedMarket(secondDrugs);
      // If we reach here, the mutant is alive (no revert on second call)
      // Verify that marketDrugs changed - this indicates mutant behavior
      const marketDrugsAfterSecondCall = await instance.marketDrugs();
      expect(marketDrugsAfterSecondCall).to.equal(secondDrugs);
      // If we assert this, the test will fail on original (which reverts) and pass on mutant
      // But we want the test to FAIL on the mutant (kill it)
      // So we need a different approach
    } catch (error: any) {
      // Original contract reverts - test passes (mutant would be killed if it doesn't revert)
      // But we need to ensure this test fails on the mutant
    }

    // Better approach: use expect().to.be.reverted to explicitly check for revert
    // This will pass on original (reverts) and fail on mutant (doesn't revert)
    await expect(instance.seedMarket(secondDrugs)).to.be.reverted;
  });
});