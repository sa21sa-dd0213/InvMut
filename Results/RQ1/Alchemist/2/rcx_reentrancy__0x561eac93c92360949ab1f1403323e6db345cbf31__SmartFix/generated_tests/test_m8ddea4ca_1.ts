import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant test - m8ddea4ca", function () {
  it("should detect mutant that logs msg.value+1 instead of msg.value in Deposit", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy LogFile first since BANK_SAFE references it
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy BANK_SAFE (no constructor arguments)
    const BankSafeFactory = await ethers.getContractFactory("BANK_SAFE");
    const bankSafe = await BankSafeFactory.deploy();
    await bankSafe.waitForDeployment();
    
    // Set up the contract: set log file, set min sum, initialize
    await bankSafe.SetLogFile(await logFile.getAddress());
    await bankSafe.SetMinSum(0); // Allow any amount for collection
    await bankSafe.Initialized();
    
    // Deposit exactly 5 wei
    const depositAmount = ethers.parseEther("0.000000000000000005"); // 5 wei
    const tx = await bankSafe.connect(user).Deposit({ value: depositAmount });
    await tx.wait();
    
    // Check the logged value in LogFile's History array (last message pushed)
    const lastMessageIndex = (await logFile.History.length()) - BigInt(1);
    const lastMessage = await logFile.History(lastMessageIndex);
    
    // The mutant logs msg.value + 1, so it will log 6 wei instead of 5 wei
    // Original would log exactly 5 wei
    expect(lastMessage.Val).to.equal(depositAmount);
  });
});