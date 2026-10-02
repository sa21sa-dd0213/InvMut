import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m04b67d78", function () {
  it("should kill the mutant by causing arithmetic overflow when _lockTime is max uint256", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.Initialized();

    // Set MinSum to 0 for testing
    await instance.SetMinSum(0);

    // Deploy a LogFile contract
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Set the LogFile address
    await instance.SetLogFile(await logFile.getAddress());

    // Attempt to call Put with max uint256 _lockTime value
    // This should revert in the original due to overflow protection,
    // but in the mutant it would succeed (killing the mutant)
    const maxUint256 = ethers.MaxUint256;
    const value = ethers.parseEther("1");

    await expect(
      instance.Put(maxUint256, { value: value })
    ).to.be.reverted;
  });
});