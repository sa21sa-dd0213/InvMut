import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant m36250f02 test", function () {
  it("should revert SetMinSum after Initialized is called", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DEP_BANK");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, call Initialized to lock the contract
    await instance.Initialized();

    // Now try to call SetMinSum - should revert because intitalized is true
    // The mutant replaces if(intitalized)revert() with if(false)revert(), so it won't revert
    await expect(
      instance.SetMinSum(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});