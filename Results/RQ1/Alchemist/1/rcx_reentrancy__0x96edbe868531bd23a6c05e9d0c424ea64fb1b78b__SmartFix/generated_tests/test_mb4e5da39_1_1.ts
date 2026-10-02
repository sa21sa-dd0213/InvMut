import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant mb4e5da39 test", function () {
  it("should kill the mutant by calling SetMinSum before Initialized is called", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // On the original contract, calling SetMinSum before Initialized() should succeed
    // because intitalized is false. On the mutant, it will always revert.
    await expect(
      instance.SetMinSum(100)
    ).to.not.be.reverted;
  });
});