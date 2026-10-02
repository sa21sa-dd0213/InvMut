import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m05670c81 test", function () {
  it("should revert SetLogFile after Initialized is called", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, initialize the contract
    await (await instance.Initialized()).wait();

    // Now attempt to call SetLogFile - should revert because contract is already initialized
    const logFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await logFactory.deploy();
    await logInstance.waitForDeployment();

    await expect(
      instance.SetLogFile(await logInstance.getAddress())
    ).to.be.reverted;
  });
});