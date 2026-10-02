import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant detection - Deposit log value", function () {
  it("should detect mutant that logs msg.value-1 instead of msg.value", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy LogFile first (required by BANK_SAFE)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy BANK_SAFE
    const BankSafeFactory = await ethers.getContractFactory("BANK_SAFE");
    const bankSafe = await BankSafeFactory.deploy();
    await bankSafe.waitForDeployment();
    
    // Setup: Set MinSum and LogFile, then initialize
    await bankSafe.connect(owner).SetMinSum(ethers.parseEther("0.1"));
    await bankSafe.connect(owner).SetLogFile(await logFile.getAddress());
    await bankSafe.connect(owner).Initialized();
    
    // Deposit exactly 1 wei
    const depositAmount = 1n;
    const tx = await bankSafe.connect(user).Deposit({ value: depositAmount });
    await tx.wait();
    
    // Check the logged value in LogFile's History array
    // The last pushed message should have Val = depositAmount (1 wei)
    // Mutant logs depositAmount - 1 = 0 wei, which would fail this assertion
    const historyLength = await logFile.History.length;
    const lastMessage = await logFile.History(historyLength - 1n);
    
    // Assert that the logged value equals the actual deposit amount
    expect(lastMessage.Val).to.equal(depositAmount);
  });
});