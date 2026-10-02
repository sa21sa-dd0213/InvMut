import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant detection - DEPOSITOR_ACCOUNT constant", function () {
  it("should detect mutant by verifying DEPOSITOR_ACCOUNT returns the contract's own address when called by the contract itself", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const contractAddress = await instance.getAddress();
    const depositorAccount = await instance.DEPOSITOR_ACCOUNT();

    // In the original contract, DEPOSITOR_ACCOUNT returns 0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001
    // In the mutant, DEPOSITOR_ACCOUNT returns address(this) which is the contract's own address
    // We verify that DEPOSITOR_ACCOUNT is NOT the contract's own address (original behavior)
    expect(depositorAccount).to.not.equal(contractAddress);
  });
});