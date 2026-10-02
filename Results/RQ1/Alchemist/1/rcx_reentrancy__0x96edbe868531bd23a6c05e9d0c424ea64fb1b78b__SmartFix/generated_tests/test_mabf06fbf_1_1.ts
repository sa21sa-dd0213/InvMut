import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant detection - mabf06fbf", function () {
  it("should detect mutant that changes >= to <= in Collect condition", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy PENNY_BY_PENNY (no constructor arguments)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a LogFile to avoid revert on Log calls
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFactory.deploy();
    await logFile.waitForDeployment();

    // Set up the contract
    await instance.SetLogFile(logFile.target);

    // Set MinSum to 1 ether
    const minSum = ethers.parseEther("1");
    await instance.SetMinSum(minSum);

    // Initialize the contract (required before Put/Collect)
    await instance.Initialized();

    // User deposits 2 ether (greater than MinSum)
    const depositAmount = ethers.parseEther("2");
    await instance.connect(user).Put(0, { value: depositAmount });

    // Verify balance is set
    const holder = await instance.Acc(user.address);
    expect(holder.balance).to.equal(depositAmount);

    // Now try to collect 1 ether (which should succeed in original, fail in mutant)
    const collectAmount = ethers.parseEther("1");

    // In original: acc.balance (2) >= MinSum (1) is true → collect succeeds
    // In mutant: acc.balance (2) <= MinSum (1) is false → collect reverts
    await expect(
      instance.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});