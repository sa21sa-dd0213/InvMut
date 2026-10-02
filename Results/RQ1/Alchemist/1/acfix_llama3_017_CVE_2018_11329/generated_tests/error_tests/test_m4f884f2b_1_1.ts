import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m4f884f2b test", function () {
  it("should revert when collectDrugs is called before seedMarket (initialized check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Try to call collectDrugs before seedMarket has been called
    // In the original contract this should revert due to require(initialized)
    // In the mutant this would not revert (no require)
    await expect(
      instance.connect(addr1).collectDrugs(ethers.ZeroAddress)
    ).to.be.reverted;
  });
});