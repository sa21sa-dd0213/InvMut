import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant me2c3752a", function () {
  it("should revert when calling SetLogFile after Initialized", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First initialize the contract
    await (await instance.Initialized()).wait();

    // Create a dummy LogFile contract address
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Attempt to call SetLogFile after initialization - should revert in original, but mutant allows it
    await expect(
      instance.SetLogFile(await logInstance.getAddress())
    ).to.be.reverted;
  });
});