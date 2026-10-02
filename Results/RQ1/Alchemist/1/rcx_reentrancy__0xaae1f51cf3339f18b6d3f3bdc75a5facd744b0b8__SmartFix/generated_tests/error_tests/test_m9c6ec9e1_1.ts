import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant m9c6ec9e1 - SetLogFile initialization guard", function () {
  it("should revert SetLogFile after Initialized() is called, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy DEP_BANK (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("DEP_BANK");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a LogFile contract for testing
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFileInstance = await LogFileFactory.deploy();
    await logFileInstance.waitForDeployment();
    
    // First, set MinSum to avoid any issues with other functions
    await instance.SetMinSum(100);
    
    // Initialize the contract (lock configuration)
    await instance.Initialized();
    
    // Attempt to call SetLogFile after initialization - should revert in original
    // but mutant will allow it since the guard is broken
    await expect(
      instance.SetLogFile(await logFileInstance.getAddress())
    ).to.be.reverted;
  });
});