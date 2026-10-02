import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m0dd5f6bd detection", function () {
  it("should revert when calling SetLogFile after Initialized() is called", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First initialize the contract (sets intitalized = true)
    await (await instance.Initialized()).wait();

    // Attempt to call SetLogFile - should revert in original, pass in mutant
    await expect(
      instance.SetLogFile(ethers.ZeroAddress)
    ).to.be.reverted;
  });
});