import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant kill test - mfe5e81cb", function () {
  it("should call SetMinSum before Initialized and succeed, but mutant always reverts", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DEP_BANK");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Try to call SetMinSum before Initialized is ever called
    // In original: should succeed (intitalized is false)
    // In mutant: will always revert (if(true)revert())
    await expect(instance.SetMinSum(100)).to.not.be.reverted;
  });
});