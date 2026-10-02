import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant detection", function () {
  it("should revert when calling SetLogFile after initialization", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First initialize the contract to lock configuration
    await (await instance.Initialized()).wait();

    // Attempt to call SetLogFile after initialization - should revert in original
    const newLogAddress = "0x0000000000000000000000000000000000000001";
    await expect(
      instance.SetLogFile(newLogAddress)
    ).to.be.reverted;
  });
});