import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant kill test - m0dc03a93", function () {
  it("should revert buyDrugs() before market is seeded (initialized==false)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call buyDrugs() before seedMarket() is called
    // The original contract reverts because initialized is false
    // The mutant would allow this call to succeed, so we expect a revert to kill the mutant
    await expect(
      instance.connect(addr1).buyDrugs({ value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});