import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant test m5fa3d898", function () {
  it("should kill the mutant by calling SetLogFile before Initialized", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // In the original, SetLogFile should succeed before Initialized is called
    // In the mutant, SetLogFile always reverts because if(true) revert()
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // This call should succeed on original but fail on mutant
    await expect(
      instance.SetLogFile(await logInstance.getAddress())
    ).to.not.be.reverted;
  });
});