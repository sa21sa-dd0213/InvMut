import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant detection - DEPOSITOR_ACCOUNT constant", function () {
  it("should detect mutant that changes DEPOSITOR_ACCOUNT to address(this)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const expectedAddress = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";
    const actualAddress = await instance.DEPOSITOR_ACCOUNT();
    
    // On the original contract, DEPOSITOR_ACCOUNT equals the expected fixed address
    // On the mutant, DEPOSITOR_ACCOUNT equals address(this) which is the contract's own address
    expect(actualAddress).to.equal(expectedAddress);
  });
});