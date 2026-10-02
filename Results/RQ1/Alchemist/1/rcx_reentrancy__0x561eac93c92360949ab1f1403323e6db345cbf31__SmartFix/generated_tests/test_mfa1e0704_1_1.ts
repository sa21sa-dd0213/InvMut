import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE - Kill mutant mfa1e0704", function () {
  it("should revert when calling SetMinSum after Initialized has been called", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, call Initialized to lock the contract
    await instance.Initialized();

    // Attempt to call SetMinSum after initialization - should revert
    await expect(
      instance.SetMinSum(100)
    ).to.be.reverted;
  });
});