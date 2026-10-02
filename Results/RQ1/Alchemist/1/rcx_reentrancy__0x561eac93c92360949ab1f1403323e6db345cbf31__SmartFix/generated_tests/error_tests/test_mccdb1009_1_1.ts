import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant mccdb1009 test", function () {
  it("should revert SetMinSum after Initialized is called, but mutant allows it", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, initialize the contract
    await instance.Initialized();

    // After initialization, SetMinSum should revert in the original contract
    // The mutant (if(false)revert()) will allow this call to succeed
    await expect(instance.SetMinSum(100)).to.be.reverted;
  });
});