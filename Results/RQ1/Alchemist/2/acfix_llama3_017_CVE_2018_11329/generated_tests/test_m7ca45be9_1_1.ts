import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherCartel mutant m7ca45be9 - getFreeKilo initialization check", function () {
  it("should revert when calling getFreeKilo before contract is initialized (seedMarket not called)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherCartel");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Contract is not initialized yet, calling getFreeKilo should revert
    await expect(
      instance.connect(addr1).getFreeKilo()
    ).to.be.reverted;
  });
});