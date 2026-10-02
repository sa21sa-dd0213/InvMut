import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX - kill mutant mec382612", function () {
  it("should succeed calling SetMinSum before initialization, but mutant always reverts", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Before initialization, SetMinSum should succeed in the original
    // The mutant changes the check to if(true)revert(), making it always revert
    await expect(
      instance.connect(owner).SetMinSum(100)
    ).to.not.be.reverted;
  });
});