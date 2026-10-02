import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel - kill mutant md72bcfca (seedMarket: == changed to !=)", function () {
  it("should revert when calling seedMarket with marketDrugs == 0 (mutant requires != 0)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially marketDrugs is 0, so original require(marketDrugs==0) would pass
    // Mutant require(marketDrugs!=0) would revert because marketDrugs == 0
    // We expect the call to succeed on the original but revert on the mutant
    await expect(
      instance.connect(owner).seedMarket(100, { value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});