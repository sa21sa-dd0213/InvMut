import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant kill test - m13e3e7eb", function () {
  it("should revert when balance >= MinSum but balance < _am and timestamp <= unlockTime (mutant incorrectly allows withdrawal)", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    const bankAddress = await bank.getAddress();
    const MinSum = ethers.parseEther("1");
    
    // User deposits exactly MinSum with unlock time far in the future
    const futureUnlock = Math.floor(Date.now() / 1000) + 100000;
    const depositAmount = MinSum;
    
    await bank.connect(user).Put(futureUnlock, { value: depositAmount });
    
    // Verify user balance is exactly MinSum
    const holder = await bank.Acc(user.address);
    expect(holder.balance).to.equal(MinSum);
    
    // Attempt to collect more than balance (e.g., 2 ether) while timestamp < unlockTime
    const withdrawAmount = ethers.parseEther("2");
    
    // In original: should revert because balance < _am (2 ether > 1 ether)
    // In mutant: condition (balance >= MinSum) is true, so OR passes incorrectly
    await expect(
      bank.connect(user).Collect(withdrawAmount)
    ).to.be.reverted;
  });
});