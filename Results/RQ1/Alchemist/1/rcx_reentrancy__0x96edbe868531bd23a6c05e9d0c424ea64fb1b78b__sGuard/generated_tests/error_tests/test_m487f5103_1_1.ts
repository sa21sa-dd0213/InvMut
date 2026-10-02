import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant test", function () {
  it("should detect the mutant where || replaces && in Collect condition", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy LogFile contract first (required by PENNY_BY_PENNY)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Deploy PENNY_BY_PENNY
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum and LogFile, then initialize
    const minSum = ethers.parseEther("1");
    await instance.connect(owner).SetMinSum(minSum);
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    await instance.connect(owner).Initialized();

    // User deposits 2 ETH with a long lock time (e.g., 100000 seconds from now)
    const depositAmount = ethers.parseEther("2");
    const lockTime = 100000;
    await instance.connect(user).Put(lockTime, { value: depositAmount });

    // User tries to collect 1 ETH while still locked (before unlock time)
    // In original: requires (balance >= MinSum AND balance >= _am AND time > unlockTime)
    //   -> time > unlockTime is false -> revert
    // In mutant: requires (balance >= MinSum OR (balance >= _am AND time > unlockTime))
    //   -> balance >= MinSum (2 >= 1) is true -> condition passes, no revert
    const collectAmount = ethers.parseEther("1");

    // This should revert in original, but pass in mutant
    await expect(
      instance.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});