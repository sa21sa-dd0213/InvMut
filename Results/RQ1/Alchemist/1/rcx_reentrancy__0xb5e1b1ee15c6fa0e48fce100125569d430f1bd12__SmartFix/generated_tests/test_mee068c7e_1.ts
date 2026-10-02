import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Private_Bank mutant kill test", function () {
  it("should detect division mutant in CashOut by verifying correct balance after withdrawal", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for Private_Bank)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy Private_Bank with Log address
    const PrivateBankFactory = await ethers.getContractFactory("Private_Bank");
    const bank = await PrivateBankFactory.deploy(log.target);
    await bank.waitForDeployment();
    
    // Deposit exactly 1 ether (MinDeposit is 1 ether, so we need to send more than that)
    // Let's send 10 ether to addr1's balance
    const depositAmount = ethers.parseEther("10");
    await bank.connect(addr1).Deposit({ value: depositAmount });
    
    // Verify initial balance
    expect(await bank.balances(addr1.address)).to.equal(depositAmount);
    
    // Withdraw 5 ether (not 1, to differentiate subtraction from division)
    const withdrawalAmount = ethers.parseEther("5");
    
    // Expected balance after withdrawal in ORIGINAL: 10 - 5 = 5 ether
    // Expected balance in MUTANT: 10 / 5 = 2 ether
    const expectedOriginalBalance = depositAmount - withdrawalAmount; // 5 ether
    
    await bank.connect(addr1).CashOut(withdrawalAmount);
    
    // Check balance after withdrawal
    const actualBalance = await bank.balances(addr1.address);
    
    // If mutant is present, actualBalance will be 2 ether instead of 5 ether
    expect(actualBalance).to.equal(expectedOriginalBalance);
  });
});