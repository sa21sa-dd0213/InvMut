import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant kill test - m4865a46a", function () {
  it("should detect mutant that logs msg.value-1 instead of msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy MONEY_BOX (no constructor arguments needed)
    const MoneyBoxFactory = await ethers.getContractFactory("MONEY_BOX");
    const moneyBox = await MoneyBoxFactory.deploy();
    await moneyBox.waitForDeployment();
    
    // Deploy Log contract (no constructor arguments needed)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Set the LogFile address in MONEY_BOX
    await moneyBox.connect(owner).SetLogFile(await log.getAddress());
    
    // Initialize the contract
    await moneyBox.connect(owner).Initialized();
    
    // Set MinSum to 0 so we can collect later if needed
    await moneyBox.connect(owner).SetMinSum(0);
    
    // Send exactly 1 wei via Put function
    const tx = await moneyBox.connect(addr1).Put(0, { value: 1 });
    await tx.wait();
    
    // Check the LogFile history - the last entry should have Val = 1
    const historyLength = await log.History.length;
    const lastEntry = await log.History(historyLength - 1n);
    
    // Original would log 1, mutant logs 0 (msg.value - 1)
    expect(lastEntry.Val).to.equal(1);
  });
});