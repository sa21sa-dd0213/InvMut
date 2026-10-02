import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant test - SetLogFile initialization check", function () {
  it("should revert when calling SetLogFile after Initialized has been called", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a LogFile contract to use as the log address
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // First call SetLogFile to set the initial log address (should succeed)
    await instance.SetLogFile(await logFile.getAddress());

    // Call Initialized to lock the contract
    await instance.Initialized();

    // Now try to call SetLogFile again with a different address
    // On the original contract this should revert because intitalized is true
    // On the mutant this will silently succeed (no revert)
    const newLogFile = await LogFileFactory.deploy();
    await newLogFile.waitForDeployment();
    
    await expect(
      instance.SetLogFile(await newLogFile.getAddress())
    ).to.be.reverted;
  });
});