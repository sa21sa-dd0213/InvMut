import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant kill test - mbb0b5dbb", function () {
  it("should detect that Collect incorrectly adds instead of subtracts balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    const bankAddress = await bank.getAddress();
    
    // Fund addr1 with some ether
    const depositAmount = ethers.parseEther("5.0");
    const withdrawAmount = ethers.parseEther("2.0");
    
    // Deposit ether into the bank (Put function)
    await bank.connect(addr1).Put(0, { value: depositAmount });
    
    // Check initial balance
    let holder = await bank.Acc(addr1.address);
    const initialBalance = holder.balance;
    expect(initialBalance).to.equal(depositAmount);
    
    // Set unlock time to past (0 is fine since block.timestamp > 0)
    // The MinSum is 1 ether, and we have 5 ether, so withdraw 2 ether should work
    
    // Execute Collect - in original this subtracts, in mutant it adds
    await bank.connect(addr1).Collect(withdrawAmount);
    
    // Check balance after Collect
    holder = await bank.Acc(addr1.address);
    const finalBalance = holder.balance;
    
    // In original: finalBalance = initialBalance - withdrawAmount = 3 ether
    // In mutant: finalBalance = initialBalance + withdrawAmount = 7 ether
    // Assert the original behavior to kill the mutant
    expect(finalBalance).to.equal(initialBalance - withdrawAmount);
  });
});