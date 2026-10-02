import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m9dab19ad test", function () {
  it("should revert SetLogFile after Initialized has been called", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, call Initialized to set intitalized = true
    await (await instance.Initialized()).wait();

    // Now attempt to call SetLogFile - should revert on original, pass on mutant
    const logFactory = await ethers.getContractFactory("Log");
    const logInstance = await logFactory.deploy();
    await logInstance.waitForDeployment();

    await expect(
      instance.SetLogFile(await logInstance.getAddress())
    ).to.be.reverted;
  });
});