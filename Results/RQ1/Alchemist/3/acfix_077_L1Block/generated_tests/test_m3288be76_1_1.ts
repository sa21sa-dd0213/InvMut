import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant kill test - m3288be76", function () {
  it("should kill the mutant by verifying DEPOSITOR_ACCOUNT constant is not address(0)", async function () {
    const [owner, depositor] = await ethers.getSigners();

    // Deploy the contract (constructor takes no arguments for Semver)
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify that DEPOSITOR_ACCOUNT is the original address, not address(0)
    const depositorAccount = await instance.DEPOSITOR_ACCOUNT();
    expect(depositorAccount).to.equal("0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001");

    // The mutant changes DEPOSITOR_ACCOUNT to address(0), so this assertion will fail on the mutant
    // This directly tests the mutated constant value
  });
});