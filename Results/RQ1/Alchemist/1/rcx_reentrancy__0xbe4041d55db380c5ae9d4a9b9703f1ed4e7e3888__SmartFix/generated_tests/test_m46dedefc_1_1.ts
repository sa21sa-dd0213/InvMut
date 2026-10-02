import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m46dedefc - SetMinSum initialization guard", function () {
  it("should revert SetMinSum after Initialized() is called, but mutant allows it", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, initialize the contract
    await instance.Initialized();

    // Now try to call SetMinSum - should revert in original, but mutant allows it
    await expect(
      instance.SetMinSum(100)
    ).to.be.reverted;
  });
});