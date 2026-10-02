import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m27891af0 - SetMinSum always reverts", function () {
  it("should succeed calling SetMinSum before Initialized() on original, but mutant will revert", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Before Initialized() is called, SetMinSum should succeed on original
    // On mutant, it will revert due to if(true) revert()
    await expect(instance.SetMinSum(100)).to.not.be.reverted;
  });
});