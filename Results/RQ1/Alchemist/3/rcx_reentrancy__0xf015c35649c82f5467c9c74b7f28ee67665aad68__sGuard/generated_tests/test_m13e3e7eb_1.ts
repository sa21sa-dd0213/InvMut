import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m13e3e7eb test", function () {
  it("should revert when balance >= MinSum but withdraw amount exceeds balance and unlock time not reached (original passes, mutant fails)", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor arg for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    const MinSum = ethers.parseEther("1");
    const depositAmount = ethers.parseEther("2"); // balance >= MinSum
    const withdrawAmount = ethers.parseEther("3"); // exceeds balance
    const futureUnlockTime = Math.floor(Date.now() / 1000) + 10000; // far in future
    
    // User deposits and sets unlock time far in future
    await bank.connect(user).Put(futureUnlockTime, { value: depositAmount });
    
    // Attempt to withdraw more than balance before unlock time
    // Original contract: reverts because (balance >= _am) is false (2 < 3) AND timestamp <= unlockTime
    // Mutant: allows because (balance >= MinSum) is true due to || operator
    await expect(
      bank.connect(user).Collect(withdrawAmount)
    ).to.be.reverted;
  });
});