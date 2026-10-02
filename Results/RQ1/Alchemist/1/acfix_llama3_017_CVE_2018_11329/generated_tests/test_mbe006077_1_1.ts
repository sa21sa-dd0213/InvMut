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
    const secondDrugs = 2000;

    // Better approach: use expect().to.be.reverted to explicitly check for revert
    // This will pass on original (reverts) and fail on mutant (doesn't revert)
    await expect(instance.seedMarket(secondDrugs)).to.be.reverted;
  });
});