import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection - mc535433c", function () {
  it("should allow withdrawal when balance exactly equals withdrawal amount (kill mutant with > instead of >=)", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required by MY_BANK constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    const minSum = ethers.parseEther("1");
    const depositAmount = minSum; // Exactly 1 ether
    
    // User deposits exactly 1 ether (the minimum sum)
    await bank.connect(user).Put(0, { value: depositAmount });
    
    // Verify balance is exactly minSum
    const holder = await bank.Acc(user.address);
    expect(holder.balance).to.equal(minSum);
    
    // Advance time past unlockTime (which was set to block.timestamp)
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine");
    
    // Attempt to withdraw exactly the deposited amount
    // Original contract allows this (balance >= _am)
    // Mutant rejects it (balance > _am is false when equal)
    const tx = bank.connect(user).Collect(depositAmount);
    
    // The mutant should cause a revert because balance == _am fails the > check
    // The original would succeed - so if it succeeds, mutant is killed (test passes)
    await expect(tx).to.not.be.reverted;
  });
});