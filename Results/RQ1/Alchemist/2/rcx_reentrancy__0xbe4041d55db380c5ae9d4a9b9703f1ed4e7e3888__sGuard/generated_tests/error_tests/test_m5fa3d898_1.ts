import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant test for SetLogFile", function () {
  it("should allow SetLogFile to succeed before initialization, but mutant reverts always", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a Log contract to pass as argument to SetLogFile
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Before initialization, SetLogFile should succeed in the original
    // In the mutant, it always reverts because if(true) revert();
    await expect(
      instance.connect(owner).SetLogFile(await logInstance.getAddress())
    ).to.not.be.reverted;
  });
});