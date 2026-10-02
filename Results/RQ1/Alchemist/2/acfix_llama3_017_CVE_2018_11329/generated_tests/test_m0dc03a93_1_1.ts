import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m0dc03a93 - kill buyDrugs initialization guard", function () {
  it("should revert when calling buyDrugs before seedMarket (initialized == false)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call buyDrugs before the market is seeded
    // The original requires initialized == true, so it should revert
    // The mutant removes this require, so it would not revert (killing the mutant)
    await expect(
      instance.connect(addr1).buyDrugs({ value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});