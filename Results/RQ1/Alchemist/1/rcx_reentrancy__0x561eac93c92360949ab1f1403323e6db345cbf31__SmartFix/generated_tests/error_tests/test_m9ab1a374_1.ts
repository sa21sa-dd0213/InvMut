import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant m9ab1a374 test", function () {
  it("should detect mutant that adds 1 extra wei to balance on deposit", async function () {
    const [owner, depositor] = await ethers.getSigners();
    
    // Deploy BANK_SAFE (no constructor arguments)
    const BankSafeFactory = await ethers.getContractFactory("BANK_SAFE");
    const bankSafe = await BankSafeFactory.deploy();
    await bankSafe.waitForDeployment();
    
    // Deploy LogFile (no constructor arguments)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Set up the contract: set MinSum to 0, set LogFile, and initialize
    await bankSafe.SetMinSum(0);
    await bankSafe.SetLogFile(await logFile.getAddress());
    await bankSafe.Initialized();
    
    // Deposit exactly 1 ether
    const depositAmount = ethers.parseEther("1.0");
    const tx = await bankSafe.connect(depositor).Deposit({ value: depositAmount });
    await tx.wait();
    
    // Try to collect the exact deposited amount - should succeed in original
    // In mutant, balance is 1 wei higher, so after collecting 1 ether, 
    // there should still be 1 wei left in balance (and collect should succeed)
    const collectTx = await bankSafe.connect(depositor).Collect(depositAmount);
    await collectTx.wait();
    
    // Check final balance - should be 0 in original, but 1 wei in mutant
    const finalBalance = await bankSafe.balances(depositor.address);
    expect(finalBalance).to.equal(0);
  });
});