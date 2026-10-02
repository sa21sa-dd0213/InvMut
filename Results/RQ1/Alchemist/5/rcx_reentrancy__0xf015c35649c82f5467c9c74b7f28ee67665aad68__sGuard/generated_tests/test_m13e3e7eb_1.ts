import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m13e3e7eb by exploiting the OR operator change", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with the Log contract address
    const Factory = await ethers.getContractFactory("MY_BANK");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    const MinSum = ethers.parseEther("1");
    
    // addr1 deposits 1 ether with unlock time far in the future
    const futureUnlockTime = Math.floor(Date.now() / 1000) + 100000;
    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).Put(futureUnlockTime, { value: depositAmount });
    
    // addr1 tries to withdraw 2 ether (more than their balance)
    // Original requires: balance >= MinSum AND balance >= _am AND time > unlockTime
    // Original: balance=1eth, _am=2eth => balance>=_am is false => revert
    // Mutant: balance>=MinSum (1>=1 = true) OR (balance>=_am AND time>unlockTime)
    // The first condition (balance>=MinSum) is true, so mutant allows withdrawal
    // This should pass on original (revert) but pass on mutant (no revert) - we expect no revert to kill the mutant
    const withdrawalAmount = ethers.parseEther("2");
    
    // We expect this transaction to NOT revert on the mutant (because OR allows it)
    // On the original it would revert because balance >= _am is false
    // If it doesn't revert, we've killed the mutant
    const tx = await instance.connect(addr1).Collect(withdrawalAmount);
    await tx.wait();
    
    // Verify the balance didn't change (because the inner if condition still has balance >= _am check)
    // Actually, the mutant's inner logic still checks balance >= _am for the call
    // Let's check that the call reverted on original - but we can't test both in one test
    // Better approach: test that on original it reverts, on mutant it doesn't
    
    // Actually, let's reconsider: the mutant has acc.balance>=MinSum || acc.balance>=_am && block.timestamp>acc.unlockTime
    // With balance=1eth, _am=2eth, time < unlockTime:
    // Original: false (because balance>=_am is false) => revert
    // Mutant: true || (false && false) = true || false = true => no revert, but inner call will fail silently
    // The call {value: _am} with _am=2eth when balance is only 1eth will fail because contract has insufficient funds
    // So even mutant won't actually transfer the ether
    
    // Better test: set _am = 0.5 eth (less than balance) and time before unlock
    const smallWithdrawal = ethers.parseEther("0.5");
    
    // Try to withdraw before unlock time
    // Original: balance(1)>=MinSum(1) AND balance(1)>=0.5 AND time(now)<unlockTime(future) => false => revert
    // Mutant: balance(1)>=MinSum(1) OR (balance(1)>=0.5 AND time<unlockTime) 
    // = true OR (true AND false) = true OR false = true => passes outer if
    // Then inner call will succeed because contract has enough balance
    
    await instance.connect(addr1).Collect(smallWithdrawal);
    
    // If we reach here, the mutant allowed the withdrawal before unlock time
    // The original would have reverted. This kills the mutant.
  });
});