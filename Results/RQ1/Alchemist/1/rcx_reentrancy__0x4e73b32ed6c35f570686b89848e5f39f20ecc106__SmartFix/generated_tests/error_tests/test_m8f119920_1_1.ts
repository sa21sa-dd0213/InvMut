import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL mutant m8f119920 test", function () {
  it("should revert SetMinSum after initialization, killing the mutant that removes the require check", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First initialize the contract
    await instance.Initialized();

    // Attempt to call SetMinSum after initialization - should revert in original
    await expect(
      instance.SetMinSum(100)
    ).to.be.reverted;
  });
});