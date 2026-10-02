import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant detection", function () {
  it("should revert SetLogFile after initialization (detects mutant m683824fc)", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy contract (no constructor arguments needed for PENNY_BY_PENNY)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, initialize the contract to lock configuration
    const initTx = await instance.Initialized();
    await initTx.wait();

    // Attempt to call SetLogFile after initialization - should revert in original
    await expect(
      instance.SetLogFile(ethers.ZeroAddress)
    ).to.be.reverted;
  });
});