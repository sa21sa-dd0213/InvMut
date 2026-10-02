import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m5e6af6ea test", function () {
  it("should revert when calling sellDrugs before market is initialized", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call sellDrugs before seedMarket has been called
    await expect(
      instance.connect(addr1).sellDrugs()
    ).to.be.reverted;
  });
});