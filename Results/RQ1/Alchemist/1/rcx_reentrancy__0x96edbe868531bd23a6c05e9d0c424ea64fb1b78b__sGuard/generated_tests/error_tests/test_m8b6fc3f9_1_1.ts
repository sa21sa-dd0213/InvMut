import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m8b6fc3f9 test", function () {
  it("should call SetLogFile before initialization and succeed on original but fail on mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a LogFile contract to pass as argument
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFileFactory.deploy();
    await logInstance.waitForDeployment();

    // Call SetLogFile before Initialized() is called
    // On original contract: should succeed because intitalized is false
    // On mutant: should revert because condition is always true
    await expect(
      instance.SetLogFile(await logInstance.getAddress())
    ).to.not.be.reverted;
  });
});