import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant kill test", function () {
  it("should detect mutant m3288be76 by verifying DEPOSITOR_ACCOUNT constant equals the original dead address", async function () {
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositorAccount = await instance.DEPOSITOR_ACCOUNT();
    const expectedAddress = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";
    expect(depositorAccount).to.equal(expectedAddress);
  });
});