import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m14636bc7 - SetMinSum without nonReentrant_", function () {
  it("should revert when calling SetMinSum after Initialized", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First initialize the contract (sets intitalized = true)
    await instance.Initialized();

    // Attempt to call SetMinSum after initialization - should revert in original
    await expect(
      instance.SetMinSum(100)
    ).to.be.reverted;
  });
});