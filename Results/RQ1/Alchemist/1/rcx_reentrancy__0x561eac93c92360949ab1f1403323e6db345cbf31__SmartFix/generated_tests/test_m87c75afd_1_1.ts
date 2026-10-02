import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant m87c75afd detection", function () {
  it("should allow SetLogFile to succeed before initialization (mutant reverts incorrectly)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a LogFile contract to use as a valid address
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Call SetLogFile BEFORE initialization - should succeed in original but revert in mutant
    await expect(
      instance.SetLogFile(await logFile.getAddress())
    ).to.not.be.reverted;
  });
});