import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant mf1f0319d test", function () {
  it("should revert on early Collect before lock time expires (original) but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy PENNY_BY_PENNY (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy LogFile (needed for AddMessage calls)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Initialize contract: set MinSum, LogFile, and mark as initialized
    await instance.connect(owner).SetMinSum(ethers.parseEther("0.1"));
    await instance.connect(owner).SetLogFile(await log.getAddress());
    await instance.connect(owner).Initialized();

    // Deposit 1 ether with lock time of 3600 seconds (1 hour)
    const depositAmount = ethers.parseEther("1");
    const lockTime = 3600;
    const txDeposit = await instance.connect(addr1).Put(lockTime, { value: depositAmount });
    await txDeposit.wait();

    // Attempt to collect 0.5 ether immediately (before lock time expires)
    const collectAmount = ethers.parseEther("0.5");

    // This should revert on original (lock still active) but pass on mutant (wrong unlockTime)
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});