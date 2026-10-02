import { expect } from "chai";
import { ethers } } from "hardhat";

describe("PrivateBank mutant md6ea39e8 detection", function () {
  it("should detect the mutant by verifying CashOut behavior with amount less than balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for PrivateBank)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy PrivateBank with the Log contract address
    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const privateBank = await PrivateBankFactory.deploy(await log.getAddress());
    await privateBank.waitForDeployment();
    
    // Get the MinDeposit value to ensure we deposit enough
    const minDeposit = await privateBank.MinDeposit();
    
    // Deposit exactly the minimum deposit from addr1
    await privateBank.connect(addr1).Deposit({ value: minDeposit });
    
    // Verify the balance was updated
    let balance = await privateBank.balances(addr1.address);
    expect(balance).to.equal(minDeposit);
    
    // Try to withdraw half of the deposited amount (should work in original, fail in mutant)
    const withdrawAmount = minDeposit / 2n;
    
    // Execute the CashOut transaction
    const tx = await privateBank.connect(addr1).CashOut(withdrawAmount);
    const receipt = await tx.wait();
    
    // Check that the transaction succeeded (no revert)
    expect(receipt.status).to.equal(1);
    
    // Verify the balance decreased by the withdrawal amount
    balance = await privateBank.balances(addr1.address);
    expect(balance).to.equal(minDeposit - withdrawAmount);
    
    // Verify the Log contract recorded the CashOut message
    const logContract = await ethers.getContractAt("Log", await log.getAddress());
    const historyLength = await logContract.History.length;
    
    // Find the last CashOut entry (it should be the most recent)
    // The deposit added one entry, the CashOut should add another
    const lastEntry = await logContract.History(historyLength - 1n);
    expect(lastEntry.Sender).to.equal(addr1.address);
    expect(lastEntry.Val).to.equal(withdrawAmount);
    expect(lastEntry.Data).to.equal("CashOut");
  });
});