import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant detection - DEPOSITOR_ACCOUNT constant", function () {
  it("should detect mutant by asserting DEPOSITOR_ACCOUNT equals the hardcoded address, not address(this)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const expectedAddress = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";
    const actualAddress = await instance.DEPOSITOR_ACCOUNT();

    // In the original contract, DEPOSITOR_ACCOUNT is the hardcoded address.
    // In the mutant, it returns the contract's own address (address(this)).
    // This assertion will pass on the original but fail on the mutant.
    expect(actualAddress).to.equal(expectedAddress);
  });
});