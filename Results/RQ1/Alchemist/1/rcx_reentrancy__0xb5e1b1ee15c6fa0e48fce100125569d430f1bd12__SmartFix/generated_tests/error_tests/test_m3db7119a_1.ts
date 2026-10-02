import { expect } from "chai";
import { ethers } from "hardhat";

describe("Private_Bank mutant detection - m3db7119a", function () {
  it("should detect mutant that changes subtraction to addition in CashOut", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for Private_Bank)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy Private_Bank with Log address
    const PrivateBankFactory = await ethers.getContractFactory("Private_Bank");
    const bankInstance = await PrivateBankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();
    
    const depositAmount = ethers.parseEther("2"); // Must be > MinDeposit (1 ether)
    
    // Deposit funds
    await bankInstance.connect(addr1).Deposit({ value: depositAmount });
    
    // Check balance after deposit
    const balanceAfterDeposit = await bankInstance.balances(addr1.address);
    expect(balanceAfterDeposit).to.equal(depositAmount);
    
    // Withdraw 1 ether
    const withdrawAmount = ethers.parseEther("1");
    await bankInstance.connect(addr1).CashOut(withdrawAmount);
    
    // In the original contract, balance should decrease by withdrawAmount
    // In the mutant (addition instead of subtraction), balance would increase
    const balanceAfterWithdraw = await bankInstance.balances(addr1.address);
    
    // Original: depositAmount - withdrawAmount = 1 ether
    // Mutant: depositAmount + withdrawAmount = 3 ether
    // Test will fail on mutant because balance is 3 instead of 1
    expect(balanceAfterWithdraw).to.equal(depositAmount - withdrawAmount);
  });
});