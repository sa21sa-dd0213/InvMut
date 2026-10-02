import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank mutant m3cd19630 test", function () {
  it("should detect that CashOut fails to execute when condition is replaced with false", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for PrivateBank)
    const LogFactory = await ethers.getContractFactory("Log");
    const logContract = await LogFactory.deploy();
    await logContract.waitForDeployment();
    
    // Deploy PrivateBank with Log contract address
    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const privateBank = await PrivateBankFactory.deploy(await logContract.getAddress());
    await privateBank.waitForDeployment();
    
    // Get the minimum deposit amount
    const minDeposit = await privateBank.MinDeposit();
    
    // Deposit exactly minDeposit from addr1
    const depositAmount = minDeposit;
    const depositTx = await privateBank.connect(addr1).Deposit({ value: depositAmount });
    await depositTx.wait();
    
    // Check balance after deposit
    const balanceAfterDeposit = await privateBank.balances(addr1.address);
    expect(balanceAfterDeposit).to.equal(depositAmount);
    
    // Get addr1's initial ether balance before CashOut
    const initialEtherBalance = await ethers.provider.getBalance(addr1.address);
    
    // Attempt to cash out the full deposited amount
    const cashOutTx = privateBank.connect(addr1).CashOut(depositAmount);
    
    // The transaction should revert because the mutant replaces the condition with false,
    // but the function doesn't have a revert for that case - it just skips the if block
    // However, we need to check the actual behavior: the transaction will succeed (no revert)
    // but nothing will happen. Let's execute and check state.
    await (await cashOutTx).wait();
    
    // Check that balance remains unchanged (mutant doesn't deduct)
    const balanceAfterCashOut = await privateBank.balances(addr1.address);
    expect(balanceAfterCashOut).to.equal(depositAmount);
    
    // Check that no ether was transferred to addr1
    const finalEtherBalance = await ethers.provider.getBalance(addr1.address);
    // Account for gas costs, but the ether should NOT have been transferred
    // The difference should be gas costs only (not the full depositAmount)
    const gasCost = (await cashOutTx).gasUsed * (await cashOutTx).gasPrice;
    expect(finalEtherBalance).to.equal(initialEtherBalance - gasCost);
    
    // Also verify that no CashOut message was added to the Log
    const logHistoryLength = await logContract.History.length;
    // There should be exactly 1 entry (from the Deposit) not 2
    expect(logHistoryLength).to.equal(1);
  });
});