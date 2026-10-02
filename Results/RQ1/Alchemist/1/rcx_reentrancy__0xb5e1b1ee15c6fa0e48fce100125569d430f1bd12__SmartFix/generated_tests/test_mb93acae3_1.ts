import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Private_Bank - kill mutant mb93acae3 (>= instead of >)", function () {
  it("should reject deposit of exactly MinDeposit (1 ether) and not update balance", async function () {
    const [owner, depositor] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for Private_Bank)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy Private_Bank with the Log contract address
    const PrivateBankFactory = await ethers.getContractFactory("Private_Bank");
    const bank = await PrivateBankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    const MinDeposit = await bank.MinDeposit();
    const depositAmount = MinDeposit; // Exactly 1 ether
    
    // Record initial balance
    const initialBalance = await bank.balances(depositor.address);
    
    // Send exactly MinDeposit (should be rejected in original, accepted in mutant)
    const tx = await bank.connect(depositor).Deposit({ value: depositAmount });
    await tx.wait();
    
    // Check balance unchanged (original behavior - should pass on original, fail on mutant)
    const finalBalance = await bank.balances(depositor.address);
    expect(finalBalance).to.equal(initialBalance);
    
    // Additional verification: Check that the deposit was NOT logged
    const historyLength = await bank.TransferLog.History.length();
    expect(historyLength).to.equal(0);
  });
});