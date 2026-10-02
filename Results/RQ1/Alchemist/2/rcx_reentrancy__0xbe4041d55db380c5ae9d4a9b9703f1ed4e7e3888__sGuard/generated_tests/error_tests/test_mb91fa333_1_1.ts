import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant mb91fa333 test", function () {
  it("should revert SetMinSum after initialization", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First initialize the contract
    await instance.Initialized();

    // After initialization, SetMinSum should revert in the original contract
    // In the mutant, it will not revert, so we expect the revert to fail (killing the mutant)
    await expect(
      instance.SetMinSum(100)
    ).to.be.reverted;
  });
});