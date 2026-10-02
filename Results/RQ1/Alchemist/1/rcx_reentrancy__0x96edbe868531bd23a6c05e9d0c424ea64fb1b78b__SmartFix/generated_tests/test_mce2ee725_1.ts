import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant mce2ee725 detection", function () {
  it("should detect mutant that logs msg.value-1 instead of msg.value", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy LogFile first (no constructor args)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy PENNY_BY_PENNY (no constructor args as per original code)
    const PennyFactory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const penny = await PennyFactory.deploy();
    await penny.waitForDeployment();
    
    // Set up the contract: set MinSum, set LogFile, and initialize
    await (await penny.SetMinSum(0)).wait();
    await (await penny.SetLogFile(await logFile.getAddress())).wait();
    await (await penny.Initialized()).wait();
    
    // Send exactly 1 wei via Put
    const amount = 1;
    const tx = await penny.connect(user).Put(0, { value: amount });
    await tx.wait();
    
    // Retrieve the logged message from LogFile's history
    // History is an array, index 0 should contain the first message
    const historyEntry = await logFile.History(0);
    const loggedVal = historyEntry.Val;
    
    // Assert that the logged value equals the amount sent (1 wei)
    // Mutant would log 0 (msg.value-1) instead of 1, causing assertion to fail
    expect(loggedVal).to.equal(amount);
  });
});