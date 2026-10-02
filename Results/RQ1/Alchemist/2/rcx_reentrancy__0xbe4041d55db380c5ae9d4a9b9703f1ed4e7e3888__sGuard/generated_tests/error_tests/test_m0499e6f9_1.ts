import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant kill test for m0499e6f9", function () {
  it("should revert on SetMinSum after initialization, but mutant allows it", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial call to SetMinSum should succeed
    await instance.SetMinSum(100);

    // Initialize the contract
    await instance.Initialized();

    // After initialization, SetMinSum should revert in original, but mutant allows it
    // If mutant is deployed, this call will succeed (kill condition)
    // If original is deployed, this call will revert
    await expect(instance.SetMinSum(200)).to.be.reverted;
  });
});