import { expect } from "chai";
import { ethers } from "hardhat";

describe("Private_Bank mutant detection - Deposit log value", function () {
  it("should detect mutant that adds 1 to msg.value in TransferLog.AddMessage", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (needed as constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy Private_Bank with Log address
    const BankFactory = await ethers.getContractFactory("Private_Bank");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Get MinDeposit to ensure we deposit enough
    const minDeposit = await bank.MinDeposit();
    
    // Deposit exactly 1 ether above min deposit
    const depositAmount = minDeposit + ethers.parseEther("1");
    const tx = await bank.connect(user).Deposit({ value: depositAmount });
    await tx.wait();
    
    // Get the last entry from Log's History array
    const historyLength = await log.History.length;
    const lastEntry = await log.History(historyLength - 1n);
    
    // The logged value should equal the actual deposit amount
    // Mutant would log depositAmount + 1, so this assertion fails on mutant
    expect(lastEntry.Val).to.equal(depositAmount);
  });
});