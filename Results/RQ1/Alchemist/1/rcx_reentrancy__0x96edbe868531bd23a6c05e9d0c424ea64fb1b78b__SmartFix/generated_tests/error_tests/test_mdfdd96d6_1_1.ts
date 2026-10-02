import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant kill test - mdfdd96d6", function () {
  it("should detect the block.prevrandao mutation by showing premature collect", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy LogFile first (no constructor args)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Deploy PENNY_BY_PENNY (no constructor args)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract: set MinSum, Log, and mark as initialized
    await (await instance.SetMinSum(ethers.parseEther("0.1"))).wait();
    await (await instance.SetLogFile(await logFile.getAddress())).wait();
    await (await instance.Initialized()).wait();

    // User deposits 1 ether with a lock time of 1 hour (3600 seconds)
    const depositAmount = ethers.parseEther("1");
    const lockTime = 3600; // 1 hour lock
    await (await instance.connect(user).Put(lockTime, { value: depositAmount })).wait();

    // Immediately try to collect 0.5 ether (should fail because lock time hasn't passed)
    const collectAmount = ethers.parseEther("0.5");

    // On original: block.timestamp + 3600 > current timestamp, so collect reverts
    // On mutant: block.prevrandao + 3600 might not be > acc.unlockTime (which was set using block.timestamp)
    // This can cause the unlockTime to not be properly updated, allowing premature collect
    await expect(
      instance.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});