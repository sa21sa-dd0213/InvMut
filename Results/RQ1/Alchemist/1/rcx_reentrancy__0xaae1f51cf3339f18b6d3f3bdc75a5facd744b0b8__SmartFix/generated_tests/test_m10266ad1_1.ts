import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant test m10266ad1", function () {
  it("should revert SetMinSum after initialization", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DEP_BANK");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set an initial MinSum value
    await instance.SetMinSum(100);
    expect(await instance.MinSum()).to.equal(100);

    // Initialize the contract
    await instance.Initialized();

    // Attempt to change MinSum after initialization - should revert in original
    await expect(
      instance.SetMinSum(200)
    ).to.be.reverted;

    // Verify MinSum remained unchanged
    expect(await instance.MinSum()).to.equal(100);
  });
});