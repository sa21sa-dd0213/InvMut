import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant ma8f379a1 detection", function () {
  it("should detect mutant by verifying balance update after successful Collect call", async function () {
    const [owner, depositor] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    const bankAddress = await bank.getAddress();
    
    // Deposit 2 ether with unlock time in the past (so it's immediately collectable)
    const pastTimestamp = 1; // Block 1 timestamp is always in the past
    await depositor.sendTransaction({
      to: bankAddress,
      value: ethers.parseEther("2"),
      data: ethers.toUtf8Bytes("") // Will trigger fallback -> Put(0)
    });
    
    // Verify deposit was recorded
    let holder = await bank.Acc(depositor.address);
    expect(holder.balance).to.equal(ethers.parseEther("2"));
    
    // Now call Collect with 1 ether (meets MinSum of 1 ether)
    const tx = await bank.connect(depositor).Collect(ethers.parseEther("1"));
    await tx.wait();
    
    // Check balance after Collect - should be reduced by 1 ether in original
    // In mutant, balance stays unchanged because condition is always false
    holder = await bank.Acc(depositor.address);
    
    // Original contract: balance = 1 ether (2 - 1)
    // Mutant: balance = 2 ether (no deduction)
    expect(holder.balance).to.equal(ethers.parseEther("1"));
  });
});