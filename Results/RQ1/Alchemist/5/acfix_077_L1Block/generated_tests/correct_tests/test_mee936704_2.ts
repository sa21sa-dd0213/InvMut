import { expect } from "chai";
import { ethers } from "hardhat";

describe("L1Block mutant detection - DEPOSITOR_ACCOUNT constant", function () {
  it("should kill mutant by asserting DEPOSITOR_ACCOUNT returns the hardcoded address, not address(this)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("L1Block");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const expectedDepositorAddress = "0xDeaDDEaDDeAdDeAdDEAdDEaddeAddEAdDEAd0001";
    const actualDepositorAddress = await instance.DEPOSITOR_ACCOUNT();

    // On the original contract, this constant returns the hardcoded address.
    // On the mutant, it returns the contract's own address (address(this)).
    // This assertion will pass on the original and fail on the mutant, killing it.
    expect(actualDepositorAddress).to.equal(expectedDepositorAddress);
  });
});