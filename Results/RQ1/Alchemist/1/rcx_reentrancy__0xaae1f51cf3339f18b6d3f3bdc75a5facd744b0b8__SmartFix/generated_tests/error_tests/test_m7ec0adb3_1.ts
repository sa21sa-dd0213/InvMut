import { expect } from "chai";
import { ethers } } from "hardhat";

describe("DEP_BANK mutant m7ec0adb3 test", function () {
  it("should revert when SetLogFile is called after initialization", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DEP_BANK");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First initialize the contract
    await instance.Initialized();

    // Attempt to set a new log file address after initialization
    // The original contract should revert, but the mutant will not
    await expect(
      instance.SetLogFile(ethers.ZeroAddress)
    ).to.be.reverted;
  });
});