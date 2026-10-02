import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant mde0a5d2a test", function () {
  it("should detect mutant that logs msg.value-1 instead of msg.value", async function () {
    const [owner, depositor] = await ethers.getSigners();

    // Deploy LogFile first
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Deploy BANK_SAFE
    const BankSafeFactory = await ethers.getContractFactory("BANK_SAFE");
    const bankSafe = await BankSafeFactory.deploy();
    await bankSafe.waitForDeployment();

    // Set up the contract: set MinSum, set LogFile, and initialize
    await bankSafe.connect(owner).SetMinSum(0);
    await bankSafe.connect(owner).SetLogFile(await logFile.getAddress());
    await bankSafe.connect(owner).Initialized();

    // Deposit exactly 100 wei
    const depositAmount = 100n;
    const tx = await bankSafe.connect(depositor).Deposit({ value: depositAmount });
    await tx.wait();

    // Check the logged value in LogFile's History
    const historyEntry = await logFile.History(0);
    const loggedVal = historyEntry.Val;

    // The mutant logs msg.value-1, so it would log 99 instead of 100
    // Assert that the logged value equals the actual deposit amount
    expect(loggedVal).to.equal(depositAmount);
  });
});