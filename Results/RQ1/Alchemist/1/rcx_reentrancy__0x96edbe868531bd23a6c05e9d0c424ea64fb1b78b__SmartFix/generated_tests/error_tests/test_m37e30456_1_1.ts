import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant test - m37e30456", function () {
  it("should kill mutant by showing that withdrawal at unlock time succeeds in original but fails in mutant (timestamp > vs <)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy LogFile first (no constructor args)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Deploy PENNY_BY_PENNY (no constructor args)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 0 and initialize
    await instance.SetMinSum(0);
    await instance.SetLogFile(await logFile.getAddress());
    await instance.Initialized();

    // Get current timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTime = blockBefore!.timestamp;

    // Lock time: 100 seconds from now
    const lockTime = 100;
    const unlockTime = currentTime + lockTime;

    // Deposit 1 ether with lock time
    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).Put(lockTime, { value: depositAmount });

    // Advance time to exactly unlock time (or slightly after)
    await ethers.provider.send("evm_setNextBlockTimestamp", [unlockTime + 1]);
    await ethers.provider.send("evm_mine");

    // Attempt to collect the full amount
    // Original contract would succeed (timestamp > unlockTime)
    // Mutant would revert (timestamp < unlockTime is false, but condition uses < so it requires timestamp < unlockTime which is false)
    // Actually mutant requires timestamp < unlockTime, so at unlockTime+1 this condition is false -> revert
    // This kills the mutant because original would succeed
    await expect(
      instance.connect(addr1).Collect(depositAmount)
    ).to.not.be.reverted;
  });
});