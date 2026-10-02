import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant mc46f5cb6 detection", function () {
  it("should allow SetLogFile before Initialized() in original, but mutant reverts always", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DEP_BANK");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a LogFile contract for the address parameter
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Before Initialized() is called, SetLogFile should succeed in the original
    // but the mutant always reverts due to if(true)revert();
    await expect(
      instance.SetLogFile(await logFile.getAddress())
    ).to.not.be.reverted;
  });
});