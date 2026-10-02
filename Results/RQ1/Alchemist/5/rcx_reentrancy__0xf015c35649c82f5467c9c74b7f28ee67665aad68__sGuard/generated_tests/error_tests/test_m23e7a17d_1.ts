import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection - m23e7a17d", function () {
  it("should detect mutant that changes block.timestamp > acc.unlockTime to block.timestamp < acc.unlockTime in Collect function", async function () {
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
    
    // Deposit funds with a future unlock time (e.g., 1 hour from now)
    const depositAmount = ethers.parseEther("2");
    const futureUnlock = Math.floor(Date.now() / 1000) + 3600; // 1 hour in the future
    
    const txDeposit = await bank.connect(depositor).Put(futureUnlock, { value: depositAmount });
    await txDeposit.wait();
    
    // Verify balance was recorded
    const holder = await bank.Acc(depositor.address);
    expect(holder.balance).to.equal(depositAmount);
    expect(holder.unlockTime).to.equal(futureUnlock);
    
    // Now attempt to collect after the unlock time has passed
    // We need to simulate time passing - we'll use ethers to increase time
    await ethers.provider.send("evm_increaseTime", [3601]); // Increase by 1 hour + 1 second
    await ethers.provider.send("evm_mine", []); // Mine a new block
    
    const collectAmount = ethers.parseEther("1");
    
    // On original contract: should succeed (timestamp > unlockTime)
    // On mutant: should revert (timestamp < unlockTime is false since timestamp is now > unlockTime)
    const txCollect = bank.connect(depositor).Collect(collectAmount);
    
    // The mutant will revert because condition block.timestamp < acc.unlockTime is false
    await expect(txCollect).to.be.reverted;
    
    // Verify balance was NOT deducted (mutant prevented withdrawal)
    const holderAfter = await bank.Acc(depositor.address);
    expect(holderAfter.balance).to.equal(depositAmount);
  });
});