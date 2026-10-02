import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant test for m9dab19ad", function () {
  it("should revert SetLogFile after Initialized is called (kills mutant that removes intitalized check)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, initialize the contract to set intitalized = true
    await instance.Initialized();

    // Now try to call SetLogFile - should revert in original, but mutant allows it
    // Deploy a Log contract to have a valid address to pass
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    await expect(
      instance.SetLogFile(await logInstance.getAddress())
    ).to.be.reverted;
  });
});