import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant test - m12f59a6d", function () {
  it("should revert when SetMinSum is called after Initialized", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, initialize the contract
    await instance.Initialized();

    // Attempt to change MinSum after initialization - should revert
    await expect(
      instance.SetMinSum(ethers.parseEther("2"))
    ).to.be.reverted;
  });
});