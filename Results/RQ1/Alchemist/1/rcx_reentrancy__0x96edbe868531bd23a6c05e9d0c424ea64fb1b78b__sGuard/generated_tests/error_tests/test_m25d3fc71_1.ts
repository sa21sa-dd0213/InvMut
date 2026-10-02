import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant detection - SetMinSum after Initialized", function () {
  it("should revert when calling SetMinSum after Initialized (original behavior)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First initialize the contract
    await instance.Initialized();

    // Then try to call SetMinSum - should revert because intitalized is true
    await expect(
      instance.SetMinSum(100)
    ).to.be.reverted;
  });
});