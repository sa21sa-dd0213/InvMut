import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant kill test - mc535433c", function () {
  it("should kill mutant by withdrawing exact balance amount (edge case of >= vs >)", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required by MY_BANK constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    const bankAddress = await bank.getAddress();
    const minSum = await bank.MinSum();
    
    // Deposit exactly MinSum (1 ether) to user's account
    const depositAmount = minSum;
    await bank.connect(user).Put(0, { value: depositAmount });
    
    // Verify balance equals MinSum
    const holder = await bank.Acc(user.address);
    expect(holder.balance).to.equal(minSum);
    
    // Now try to withdraw exactly the balance amount
    // The original allows this (>=), but the mutant rejects it (>)
    await expect(
      bank.connect(user).Collect(depositAmount)
    ).to.not.be.reverted;
    
    // Verify the withdrawal succeeded (balance should be 0)
    const holderAfter = await bank.Acc(user.address);
    expect(holderAfter.balance).to.equal(0);
  });
});