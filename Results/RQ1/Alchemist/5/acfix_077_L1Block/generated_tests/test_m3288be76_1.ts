import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant detection", function () {
  it("should detect mutant m3288be76 by checking DEPOSITOR_ACCOUNT constant value", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const expectedAddress = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";
    const actualAddress = await instance.DEPOSITOR_ACCOUNT();
    
    expect(actualAddress).to.equal(expectedAddress);
  });
});