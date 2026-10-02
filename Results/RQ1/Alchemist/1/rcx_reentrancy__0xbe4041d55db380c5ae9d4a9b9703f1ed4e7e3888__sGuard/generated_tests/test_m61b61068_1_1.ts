import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m61b61068 test", function () {
  it("should revert when calling SetLogFile after Initialized", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a Log contract for testing
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // First call Initialized to lock the contract
    await (await instance.Initialized()).wait();

    // Attempt to call SetLogFile after initialization - should revert in original
    await expect(
      instance.SetLogFile(await logInstance.getAddress())
    ).to.be.reverted;
  });
});