import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant kill test for SetMinSum", function () {
  it("should revert when calling SetMinSum after Initialized", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract to lock configuration
    await instance.Initialized();

    // Attempt to change MinSum after initialization - should revert in original
    await expect(
      instance.SetMinSum(100)
    ).to.be.reverted;
  });
});